// Video Editor Server - Handles FFplay preview and FFmpeg export
import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join, basename } from "path";
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
  createWriteStream,
} from "fs";
import https from "https";
import http from "http";
import { finished } from "stream/promises";
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

// Serve uploaded files statically
// Serve uploaded files statically
app.use("/uploads", express.static(join(__dirname, "../uploads")));

const io = new SocketIOServer(server, {
  cors: { origin: "*" },
});

const PORT = 3000;

// Ensure uploads directory exists
const uploadsDir = join(__dirname, "../uploads");
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
  console.log("Created uploads directory at:", uploadsDir);
} else {
  console.log("Using uploads directory at:", uploadsDir);
}

// Configure multer with disk storage to preserve extensions
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = file.originalname.split(".").pop();
    cb(null, `upload_${timestamp}.${ext}`);
  },
});
const upload = multer({ storage });

// Store current video and filters
let currentVideoPath = null;
let currentFilters = "";
let currentSeekTime = "00:00:00";

// Get video duration using ffprobe
function getVideoDuration(videoPath) {
  try {
    const fullPath = videoPath.startsWith("/")
      ? videoPath
      : videoPath.startsWith("uploads/")
      ? join(__dirname, "../", videoPath)
      : join(process.cwd(), videoPath);
    const output = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${fullPath}"`,
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
  if (!seconds || isNaN(seconds)) return "00:00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(
    s
  ).padStart(2, "0")}`;
}

// Build FFmpeg filter string from params
function buildFilterString(filters) {
  if (!filters) return "";
  const parts = [];

  if (filters.crop1) {
    parts.push(
      `crop=${filters.crop1.width || "iw"}:${filters.crop1.height || "ih"}:${
        filters.crop1.x || 0
      }:${filters.crop1.y || 0}`
    );
  }

  if (filters.v360) {
    const f = filters.v360;
    let v360Str =
      `v360=input=${f.input || "equirect"}:output=${
        f.output || "rectilinear"
      }:` +
      `ih_fov=${f.ih_fov ?? 180}:iv_fov=${f.iv_fov ?? 180}:` +
      `h_fov=${f.h_fov ?? 98}:v_fov=${f.v_fov ?? 98}:` +
      `yaw=${f.yaw ?? 0}:pitch=${f.pitch ?? 0}:roll=${f.roll ?? 0}:` +
      `interp=spline16`;

    if (f.w && f.h) {
      v360Str += `:w=${f.w}:h=${f.h}`;
    }
    parts.push(v360Str);
  }

  if (filters.lenscorrection) {
    parts.push(
      `lenscorrection=k1=${filters.lenscorrection.k1 ?? 0}:k2=${
        filters.lenscorrection.k2 ?? 0
      }`
    );
  }

  if (filters.crop2) {
    parts.push(
      `crop=${filters.crop2.width || "iw"}:${filters.crop2.height || "ih"}:${
        filters.crop2.x || 0
      }:${filters.crop2.y || 0}`
    );
  }

  if (filters.scale) {
    parts.push(
      `scale=${filters.scale.width || "iw"}:${
        filters.scale.height || "ih"
      }:flags=${filters.scale.flags || "lanczos"}`
    );
  }

  if (filters.hqdn3d) {
    const h = filters.hqdn3d;
    parts.push(
      `hqdn3d=${h.spatial_luma ?? 0}:${h.spatial_chroma ?? 0}:` +
        `${h.temporal_luma ?? 0}:${h.temporal_chroma ?? 0}`
    );
  }

  if (filters.unsharp) {
    const u = filters.unsharp;
    parts.push(
      `unsharp=${u.luma_msize_x ?? 3}:${u.luma_msize_y ?? 3}:${
        u.luma_amount ?? 0
      }`
    );
  }

  if (filters.format) {
    parts.push(`format=${filters.format}`);
  }

  if (filters.setsar !== undefined) {
    parts.push(`setsar=${filters.setsar}`);
  }

  // Final debanding pass to remove macroblocks and "square pixels"
  parts.push("deband=1thr=0.02:2thr=0.02:3thr=0.02:blur=1");

  return parts.filter(Boolean).join(",");
}

// API routes

// Clear all files in uploads and outputs
app.post("/clear-files", (req, res) => {
  console.log("--- Clear Storage Request Received ---");
  const outputsDir = join(__dirname, "outputs");
  const uploadsPath = uploadsDir;
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

// List all videos in the uploads directory
app.get("/list-videos", (req, res) => {
  try {
    const files = readdirSync(uploadsDir);
    const videos = files
      .map((file) => {
        try {
          const stats = lstatSync(join(uploadsDir, file));
          return {
            name: file,
            path: `uploads/${file}`,
            size: stats.size,
            mtime: stats.mtime,
          };
        } catch (e) {
          console.warn(`Skipping file ${file}:`, e.message);
          return null;
        }
      })
      .filter((f) => f && !f.name.startsWith(".")); // Ignore hidden files

    res.json({ success: true, videos });
  } catch (error) {
    console.error("Error listing videos:", error);
    res.status(500).json({ error: "Failed to list videos" });
  }
});

// Delete a specific video file
app.post("/delete-video", (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: "No video name provided" });
  }

  // Basic security: only allow deleting files in the uploadsDir
  const safeName = name.split("/").pop().split("\\").pop();
  const filePath = join(uploadsDir, safeName);

  try {
    if (existsSync(filePath)) {
      unlinkSync(filePath);
      console.log(`Manually deleted video: ${safeName}`);
      res.json({ success: true, message: `Video ${safeName} deleted` });
    } else {
      res.status(404).json({ error: "Video file not found" });
    }
  } catch (error) {
    console.error("Error deleting video:", error);
    res.status(500).json({ error: "Failed to delete video" });
  }
});

// Download video from URL using streams
app.post("/download-video", async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: "No URL provided" });
  }

  console.log("Downloading video from URL:", url);
  const timestamp = Date.now();
  const filename = `downloaded_${timestamp}.mp4`;
  const filePath = join(uploadsDir, filename);

  try {
    const isHLS = url.toLowerCase().includes(".m3u8");

    if (isHLS) {
      console.log("HLS/m3u8 detected, using ffmpeg for download/muxing...");
      const ffmpegCmd = `ffmpeg -i "${url}" -c copy -bsf:a aac_adtstoasc -movflags +faststart -y "${filePath}"`;
      console.log("Executing ffmpeg download command:", ffmpegCmd);

      await new Promise((resolve, reject) => {
        exec(ffmpegCmd, (error) => {
          if (error) {
            reject(new Error(`FFmpeg HLS download failed: ${error.message}`));
          } else {
            resolve();
          }
        });
      });
    } else {
      // Direct file download using streams
      const file = createWriteStream(filePath);
      const protocol = url.startsWith("https") ? https : http;

      await new Promise((resolve, reject) => {
        protocol
          .get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
              // Handle one level of redirect
              protocol
                .get(response.headers.location, (redirectResponse) => {
                  if (redirectResponse.statusCode !== 200) {
                    reject(
                      new Error(
                        `Failed to download: ${redirectResponse.statusCode}`
                      )
                    );
                    return;
                  }
                  redirectResponse.pipe(file);
                  file.on("finish", () => {
                    file.close();
                    resolve();
                  });
                })
                .on("error", reject);
              return;
            }

            if (response.statusCode !== 200) {
              reject(new Error(`Failed to download: ${response.statusCode}`));
              return;
            }

            response.pipe(file);
            file.on("finish", () => {
              file.close();
              resolve();
            });
          })
          .on("error", (err) => {
            reject(err);
          });
      });
    }

    // Get video duration
    const duration = getVideoDuration(filePath);
    const formattedDuration = formatDuration(duration);

    res.json({
      success: true,
      path: `uploads/${basename(filePath)}`,
      name: filename,
      duration,
      formattedDuration,
    });
  } catch (error) {
    console.error("Download error:", error);
    if (existsSync(filePath)) unlinkSync(filePath);
    res.status(500).json({
      success: false,
      error: "Download failed",
      message: error.message,
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
    path: `uploads/${basename(filePath)}`,
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

  const outputDir = join(__dirname, "outputs");
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = Date.now();
  const outputPath = join(
    outputDir,
    `output_${task.id.slice(-4)}_${timestamp}.mp4`
  );

  const filterString = buildFilterString(task.filters);
  const filterArg = filterString ? `-vf "${filterString}"` : "";

  // FFmpeg command for the segment - ultra high quality settings
  const cmd = `ffmpeg -ss ${task.startTime} -to ${task.endTime} -i "${videoPath}" ${filterArg} -c:v libx264 -preset slow -crf 16 -tune film -pix_fmt yuv420p -y "${outputPath}"`;

  console.log("FFmpeg command:", cmd);

  try {
    execSync(cmd, { stdio: "inherit" });
    res.json({ success: true, outputPath });
  } catch (error) {
    console.error("FFmpeg error:", error);
    res.status(500).json({ error: "FFmpeg process failed" });
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

  const timestamp = Date.now();
  const finalOutputPath = join(outputDir, `merged_video_${timestamp}.mp4`);
  const segmentFiles = [];

  try {
    // Process each task
    for (const task of tasks) {
      if (glueOnly && task.outputPath) {
        // In glueOnly mode, task.outputPath is already the absolute path to the generated segment
        segmentFiles.push(task.outputPath);
        continue;
      }

      console.log("Processing task:", task.id);
      const filterString = buildFilterString(task.filters);
      const filterArg = filterString ? `-vf "${filterString}"` : "";
      const segmentFile = `segment_${task.id}.mp4`;
      const segmentPath = join(outputDir, segmentFile);

      const cmd = `ffmpeg -ss ${task.startTime} -to ${task.endTime} -i "${videoPath}" ${filterArg} -c:v libx264 -preset slow -crf 16 -tune film -pix_fmt yuv420p -y "${segmentPath}"`;

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
