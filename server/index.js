// Video Editor Server - Handles FFplay preview and FFmpeg export
import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from "path";
import { startPreview, stopPreview, isPreviewRunning } from "./ffplay.js";
import multer from "multer";
import cors from "cors";
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readdirSync,
  unlinkSync,
  lstatSync,
} from "fs";
import { exec, execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);

// Enable CORS for all routes - moved to top
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
  })
);

// Add a simple request logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const io = new SocketIOServer(server, {
  cors: { origin: "*" },
});

const PORT = 3001;

// Ensure uploads directory exists
const uploadsDir = "uploads/";
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
  console.log("Created uploads directory");
}

// Configure multer for file uploads
const upload = multer({ dest: uploadsDir });

// Store current video and filters
let currentVideoPath = null;
let currentFilters = "";
let currentSeekTime = "00:00:00";

// Get video duration using ffprobe
function getVideoDuration(videoPath) {
  try {
    const output = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`,
      { encoding: "utf8" }
    );
    const duration = parseFloat(output.trim());
    return duration;
  } catch (error) {
    console.error("Error getting video duration:", error);
    return null;
  }
}

// Format seconds to HH:MM:SS
function formatDuration(seconds) {
  if (!seconds) return "00:00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(
    s
  ).padStart(2, "0")}`;
}

// Build FFmpeg filter string from params
function buildFilterString(filters) {
  const parts = [];

  if (filters.crop1) {
    parts.push(
      `crop=${filters.crop1.width}:${filters.crop1.height}:${filters.crop1.x}:${filters.crop1.y}`
    );
  }

  if (filters.v360) {
    parts.push(
      `v360=input=${filters.v360.input}:output=${filters.v360.output}:` +
        `ih_fov=${filters.v360.ih_fov}:iv_fov=${filters.v360.iv_fov}:` +
        `h_fov=${filters.v360.h_fov}:v_fov=${filters.v360.v_fov}:` +
        `yaw=${filters.v360.yaw}:pitch=${filters.v360.pitch}:roll=${filters.v360.roll}`
    );
  }

  if (filters.lenscorrection) {
    parts.push(
      `lenscorrection=k1=${filters.lenscorrection.k1}:k2=${filters.lenscorrection.k2}`
    );
  }

  if (filters.crop2) {
    parts.push(
      `crop=${filters.crop2.width}:${filters.crop2.height}:${filters.crop2.x}:${filters.crop2.y}`
    );
  }

  if (filters.scale) {
    parts.push(
      `scale=${filters.scale.width}:${filters.scale.height}:flags=${filters.scale.flags}`
    );
  }

  if (filters.hqdn3d) {
    parts.push(
      `hqdn3d=${filters.hqdn3d.spatial_luma}:${filters.hqdn3d.spatial_chroma}:` +
        `${filters.hqdn3d.temporal_luma}:${filters.hqdn3d.temporal_chroma}`
    );
  }

  if (filters.unsharp) {
    parts.push(
      `unsharp=${filters.unsharp.luma_msize_x}:${filters.unsharp.luma_msize_y}:${filters.unsharp.luma_amount}`
    );
  }

  if (filters.format) {
    parts.push(`format=${filters.format}`);
  }

  if (filters.setsar !== undefined) {
    parts.push(`setsar=${filters.setsar}`);
  }

  return parts.filter(Boolean).join(",");
}

// API routes

// Clear all files in uploads and outputs
app.post("/clear-files", (req, res) => {
  console.log("--- Clear Storage Request Received ---");
  const outputsDir = join(__dirname, "outputs");
  const uploadsPath = join(process.cwd(), uploadsDir);
  const dirs = [uploadsPath, outputsDir];
  let deletedCount = 0;
  let errors = [];

  try {
    dirs.forEach((dir) => {
      console.log(`Checking directory: ${dir}`);
      if (existsSync(dir)) {
        const files = readdirSync(dir);
        console.log(`Found ${files.length} items in ${dir}`);
        files.forEach((file) => {
          const filePath = join(dir, file);
          try {
            const stats = lstatSync(filePath);
            if (stats.isFile()) {
              console.log(`Deleting file: ${filePath}`);
              unlinkSync(filePath);
              deletedCount++;
            } else {
              console.log(`Skipping non-file item: ${filePath}`);
            }
          } catch (fileErr) {
            console.error(`Failed to delete ${filePath}:`, fileErr.message);
            errors.push(`${file}: ${fileErr.message}`);
          }
        });
      } else {
        console.warn(`Directory does not exist: ${dir}`);
      }
    });

    console.log(
      `Cleanup complete. Deleted: ${deletedCount}, Errors: ${errors.length}`
    );
    res.json({
      success: true,
      deletedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("CRITICAL ERROR during /clear-files:", error);
    res.status(500).json({
      error: "Failed to clear files",
      message: error.message,
      stack: error.stack,
    });
  }
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.get("/", (_req, res) => {
  res.json({
    ok: true,
    name: "Video Editor API",
    previewRunning: isPreviewRunning(),
    note: "Server is running",
  });
});

// File upload endpoint
app.post("/upload", upload.single("video"), (req, res) => {
  console.log("Upload request received");
  console.log("Body:", req.body);
  console.log("File:", req.file);

  if (!req.file) {
    console.error("No file in request");
    return res.status(400).json({ error: "No file uploaded" });
  }

  const filePath = req.file.path;
  console.log("Video uploaded successfully:", filePath);

  // Get video duration
  const duration = getVideoDuration(filePath);
  const formattedDuration = formatDuration(duration);

  console.log("Video duration:", formattedDuration);

  res.json({
    path: filePath,
    duration: duration,
    formattedDuration,
  });
});

// Process a single task
app.post("/process-task", (req, res) => {
  console.log("Processing single task request");

  if (!req.body || typeof req.body !== "object") {
    console.error("Invalid or missing request body");
    return res.status(400).json({ error: "Invalid or missing request body" });
  }

  const { videoPath, task } = req.body;
  if (!videoPath || !task) {
    console.error("Missing videoPath or task in body:", {
      hasVideoPath: !!videoPath,
      hasTask: !!task,
    });
    return res.status(400).json({ error: "Missing videoPath or task in body" });
  }

  console.log("Processing task:", task.id);
  console.log("Time range:", task.startTime, "-", task.endTime);

  // Build filter string for this task
  const filterString = buildFilterString(task.filters);
  const filterArg = filterString ? `-vf "${filterString}"` : "";

  // Calculate output path
  const outputFile = `output_${task.id}.mp4`;
  const outputPath = join(__dirname, "outputs", outputFile);

  // Ensure outputs directory exists
  const outputsDir = join(__dirname, "outputs");
  if (!existsSync(outputsDir)) {
    mkdirSync(outputsDir, { recursive: true });
  }

  // FFmpeg command for this task
  const cmd = `ffmpeg -ss ${task.startTime} -to ${task.endTime} -i "${videoPath}" ${filterArg} -preset medium -crf 23 -y "${outputPath}"`;

  console.log("FFmpeg command:", cmd);

  try {
    execSync(cmd, { stdio: "inherit" });
    console.log("Task completed:", task.id);
    console.log("Output file:", outputPath);

    res.json({
      success: true,
      outputPath,
    });
  } catch (error) {
    console.error("Error processing task:", error);
    console.error("Error message:", error.message);
    res
      .status(500)
      .json({ error: "Failed to process task", message: error.message });
  }
});

// Process multiple tasks and merge
app.post("/process-tasks", (req, res) => {
  if (!req.body || typeof req.body !== "object") {
    console.error("Invalid or missing request body in /process-tasks");
    return res.status(400).json({ error: "Invalid or missing request body" });
  }

  const { videoPath, tasks } = req.body;

  if (!videoPath || !tasks || !Array.isArray(tasks)) {
    return res
      .status(400)
      .json({ error: "Missing videoPath or tasks array in body" });
  }

  console.log("Processing", tasks.length, "tasks and merging");
  const glueOnly = req.body.glueOnly === true;

  const outputDir = join(__dirname, "outputs");
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const finalOutputPath = join(outputDir, "merged_video.mp4");

  try {
    const segmentFiles = [];

    // Process each task
    for (const task of tasks) {
      if (glueOnly) {
        if (!task.outputPath) {
          throw new Error(
            `Task ${task.id} has no outputPath for glueOnly mode`
          );
        }
        // In glueOnly mode, task.outputPath is already the absolute path to the generated segment
        segmentFiles.push(task.outputPath);
        continue;
      }

      console.log("Processing task:", task.id);
      const filterString = buildFilterString(task.filters);
      const filterArg = filterString ? `-vf "${filterString}"` : "";
      const segmentFile = `segment_${task.id}.mp4`;
      const segmentPath = join(outputDir, segmentFile);

      const cmd = `ffmpeg -ss ${task.startTime} -to ${task.endTime} -i "${videoPath}" ${filterArg} -preset medium -crf 23 -y "${segmentPath}"`;

      console.log("Segment FFmpeg command:", cmd);
      execSync(cmd, { stdio: "inherit" });
      segmentFiles.push(segmentPath);
    }

    // Create file list for concatenation
    const fileListPath = join(outputDir, "filelist.txt");
    const fileListContent = segmentFiles
      .map((filePath) => `file '${filePath}'`)
      .join("\n");

    writeFileSync(fileListPath, fileListContent);

    // Concatenate all segments
    const concatCmd = `ffmpeg -f concat -safe 0 -i "${fileListPath}" -c copy "${finalOutputPath}"`;

    console.log("Concatenating segments:", concatCmd);
    execSync(concatCmd, { stdio: "inherit" });

    // Cleanup segments if they were just glued/processed for a merge
    try {
      segmentFiles.forEach((file) => {
        if (existsSync(file)) {
          unlinkSync(file);
          console.log(`Deleted segment after merge: ${file}`);
        }
      });
      if (existsSync(fileListPath)) {
        unlinkSync(fileListPath);
      }
    } catch (cleanupErr) {
      console.error("Error during segment cleanup:", cleanupErr);
    }

    console.log("Merge complete:", finalOutputPath);

    res.json({
      success: true,
      outputPath: finalOutputPath,
    });
  } catch (error) {
    console.error("Error processing tasks:", error);
    res.status(500).json({ error: "Failed to process and merge tasks" });
  }
});

app.use((req, res, next) => {
  console.log(`404 NOT MATCHED: ${req.method} ${req.url}`);
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.method} ${req.url} not found on this server`,
    availableRoutes: [
      "/health",
      "/upload",
      "/process-task",
      "/process-tasks",
      "/clear-files",
    ],
  });
});

app.use((err, _req, res, _next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: err.message });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Start preview with current filters
  socket.on('startPreview', (data) => {
    const { videoPath, filters, seekTime } = data;

    if (!videoPath) {
      socket.emit('previewError', { error: 'No video path provided' });
      return;
    }

    currentVideoPath = videoPath;
    currentFilters = buildFilterString(filters);
    currentSeekTime = seekTime || currentSeekTime;

    console.log('Starting preview with filters:', currentFilters);
    startPreview(currentVideoPath, currentFilters, currentSeekTime);

    socket.emit('previewStarted', { success: true });
  });

  // Update filters and restart preview
  socket.on('updateFilters', (data) => {
    const { filters } = data;
    currentFilters = buildFilterString(filters);

    console.log('Updating preview filters:', currentFilters);

    if (currentVideoPath && isPreviewRunning()) {
      stopPreview();
      setTimeout(() => {
        startPreview(currentVideoPath, currentFilters, currentSeekTime);
      }, 100);
    }

    socket.emit('filtersUpdated', { success: true });
  });

  // Seek to specific time
  socket.on('seekPreview', (data) => {
    const { seekTime } = data;
    currentSeekTime = seekTime;

    console.log('Seeking to:', seekTime);

    if (currentVideoPath) {
      stopPreview();
      setTimeout(() => {
        startPreview(currentVideoPath, currentFilters, currentSeekTime);
      }, 100);
    }

    socket.emit('previewSeeked', { success: true, seekTime });
  });

  // Stop preview
  socket.on('stopPreview', () => {
    console.log('Stopping preview');
    stopPreview();
    socket.emit('previewStopped', { success: true });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    stopPreview();
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Socket.IO server ready for connections`);
});
