import { useState, useRef, useEffect } from "react";
import { socket } from "./lib/socket";
import type { FilterParams, Task, VideoFile } from "./types";
import VideoSelector from "./components/VideoSelector";
import PreviewControls from "./components/PreviewControls";
import TaskList from "./components/TaskList";
import FilterControls from "./components/FilterControls";
import ExportControls from "./components/ExportControls";
import TaskModal from "./components/TaskModal";

const defaultFilters: FilterParams = {
  crop1: { width: "iw/2", height: "ih", x: "iw/2", y: "0" },
  v360: {
    input: "equirect",
    output: "rectilinear",
    ih_fov: 140, // Changed from 180
    iv_fov: 140, // Changed from 180
    h_fov: 98,
    v_fov: 98,
    yaw: 0,
    pitch: 0,
    roll: 0,
    interp: "spline16",
    w: 0,
    h: 0,
  },
  lenscorrection: { k1: 0.8, k2: -0.08 },
  crop2: {
    width: "iw*0.85",
    height: "ih*0.85",
    x: "(iw-iw*0.85)/2",
    y: "(ih-ih*0.85)/2",
  },
  scale: { width: "iw", height: "ih", flags: "lanczos" },
  hqdn3d: {
    spatial_luma: 1.0, // Match: 1.0
    spatial_chroma: 0.8, // Match: 0.8
    temporal_luma: 6.0, // Match: 6
    temporal_chroma: 4.0, // Match: 4
  },
  unsharp: { luma_msize_x: 3, luma_msize_y: 3, luma_amount: 0.5 },
  format: "yuv420p",
  setsar: 1,
  zoom: 1.0,
  aspectRatio: "original",
  yaw: 0,
  pitch: 0,
};

const API_BASE_URL = "/api";

const formatTime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s
    .toString()
    .padStart(2, "0")}`;
};

function App() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoPath, setVideoPath] = useState<string>("");
  const [filters, setFilters] = useState<FilterParams>(defaultFilters);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportStatus, setExportStatus] = useState<string>("Ready");
  const [previewRunning, setPreviewRunning] = useState<boolean>(false);
  const [seekTime, setSeekTime] = useState<string>("00:00:00");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [showTaskModal, setShowTaskModal] = useState<boolean>(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [tempTaskData, setTempTaskData] = useState<Partial<Task>>({});
  const [mergeTasks, setMergeTasks] = useState<boolean>(false);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchVideos = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/list-videos`);
      const data = await response.json();
      if (data.success) {
        setVideos(data.videos);
      }
    } catch (error) {
      console.error("Failed to fetch videos:", error);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("video", file);

    try {
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      setVideoUrl(`${API_BASE_URL}/${data.path}`);
      setVideoPath(data.path);
      fetchVideos();
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload video");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUrlDownload = async (url: string) => {
    setIsDownloading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/download-video`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();
      if (data.success) {
        setVideoUrl(`${API_BASE_URL}/${data.path}`);
        setVideoPath(data.path);
        fetchVideos();
      } else {
        alert("Failed to download video: " + data.error);
      }
    } catch (error) {
      console.error("Download failed:", error);
      alert("Error downloading video");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleVideoSelect = (video: VideoFile) => {
    setVideoUrl(`${API_BASE_URL}/${video.path}`);
    setVideoPath(video.path);
  };

  const handleVideoDelete = async (video: VideoFile) => {
    try {
      const resp = await fetch(`${API_BASE_URL}/delete-video`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: video.name }),
      });
      const data = await resp.json();
      if (data.success) {
        if (videoPath === video.path) {
          setVideoUrl(null);
          setVideoPath("");
        }
        fetchVideos();
      } else {
        alert("Failed to delete: " + data.error);
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("Error deleting video");
    }
  };

  const updateFilter = (
    filter: keyof FilterParams,
    key: string,
    value: string | number
  ) => {
    setFilters((prev) => {
      const newFilters = { ...prev };

      if (filter === "zoom") {
        const zoomVal = value as number;
        newFilters.zoom = zoomVal;
        const baseFOV = 98;
        newFilters.v360 = {
          ...newFilters.v360,
          h_fov: +(baseFOV / zoomVal).toFixed(2),
          v_fov: +(baseFOV / zoomVal).toFixed(2),
        };
        newFilters.lenscorrection = {
          k1: +(0.8 / zoomVal).toFixed(3),
          k2: +(-0.08 / zoomVal).toFixed(3),
        };
      } else if (filter === "aspectRatio") {
        const ratio = value as string;
        newFilters.aspectRatio = ratio;
        if (ratio === "16:9") {
          newFilters.crop2 = {
            ...newFilters.crop2,
            width: "iw",
            height: "iw*(9/16)",
            x: "0",
            y: "(ih-iw*(9/16))/2",
          };
          newFilters.scale = {
            ...newFilters.scale,
            width: "iw",
            height: "iw*(9/16)",
          };
        } else if (ratio === "9:16") {
          newFilters.crop2 = {
            ...newFilters.crop2,
            width: "ih*(9/16)",
            height: "ih",
            x: "(iw-ih*(9/16))/2",
            y: "0",
          };
          newFilters.scale = {
            ...newFilters.scale,
            width: "ih*(9/16)",
            height: "ih",
          };
        } else if (ratio === "1:1") {
          newFilters.crop2 = {
            ...newFilters.crop2,
            width: "min(iw,ih)",
            height: "min(iw,ih)",
            x: "(iw-min(iw,ih))/2",
            y: "(ih-min(iw,ih))/2",
          };
          newFilters.scale = {
            ...newFilters.scale,
            width: "min(iw,ih)",
            height: "min(iw,ih)",
          };
        } else {
          newFilters.crop2 = defaultFilters.crop2;
          newFilters.scale = defaultFilters.scale;
        }
      } else if (filter === "yaw") {
        const yawVal = value as number;
        newFilters.yaw = yawVal;
        newFilters.v360 = { ...newFilters.v360, yaw: yawVal };
      } else if (filter === "pitch") {
        const pitchVal = value as number;
        newFilters.pitch = pitchVal;
        newFilters.v360 = { ...newFilters.v360, pitch: pitchVal };
      } else {
        const obj = prev[filter as keyof FilterParams] as Record<
          string,
          string | number
        >;
        const newObj = { ...obj, [key]: value };
        const fKey = filter as keyof FilterParams;
        (newFilters as Record<string, unknown>)[fKey] = newObj;
      }
      return newFilters;
    });
  };

  const handleOpenTaskModal = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setTempTaskData(task);
    } else {
      setEditingTask(null);
      setTempTaskData({
        startTime: "00:00:00",
        endTime: "00:00:05",
        quality: "medium",
        filters: { ...filters },
      });
    }
    setShowTaskModal(true);
  };

  const closeTaskModal = () => {
    setShowTaskModal(false);
    setEditingTask(null);
    setTempTaskData({});
  };

  const handleSaveTaskData = () => {
    if (!tempTaskData.startTime || !tempTaskData.endTime) {
      alert("Please fill in time range");
      return;
    }
    if (editingTask) {
      setTasks(
        tasks.map((t) =>
          t.id === editingTask.id
            ? ({ ...t, ...tempTaskData, status: "pending" } as Task)
            : t
        )
      );
    } else {
      const newTask: Task = {
        id: `task-${Date.now()}`,
        startTime: tempTaskData.startTime!,
        endTime: tempTaskData.endTime!,
        filters: tempTaskData.filters || { ...filters },
        quality: (tempTaskData.quality as Task["quality"]) || "medium",
        status: "pending",
        mergeOrder: tasks.length + 1,
      };
      setTasks([...tasks, newTask]);
    }
    closeTaskModal();
  };

  const handleClearStorage = async () => {
    if (
      !confirm(
        "This will permanently delete ALL uploaded videos and exported tasks. Are you sure?"
      )
    )
      return;
    try {
      const response = await fetch(`${API_BASE_URL}/clear-files`, {
        method: "POST",
      });
      if (response.ok) {
        const result = await response.json();
        alert(`Storage cleared! Deleted ${result.deletedCount} files.`);
        setVideoUrl(null);
        setVideoPath("");
        setTasks([]);
        setExportStatus("Storage cleared");
        setExportProgress(0);
        fetchVideos();
      }
    } catch {
      console.error("Clear storage error");
    }
  };

  const handleLoadTaskFilters = (task: Task) => setFilters(task.filters);

  const handleSaveTaskFilters = () => {
    if (!selectedTaskId) return;
    setTasks(
      tasks.map((t) =>
        t.id === selectedTaskId
          ? { ...t, filters: { ...filters }, status: "pending" }
          : t
      )
    );
    alert("Filters saved to task!");
  };

  const processTask = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || !videoPath) return;
    try {
      setTasks(
        tasks.map((t) => (t.id === taskId ? { ...t, status: "processing" } : t))
      );
      const response = await fetch(`${API_BASE_URL}/process-task`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoPath, task }),
      });
      const result = await response.json();
      if (result.success) {
        setTasks(
          tasks.map((t) =>
            t.id === taskId
              ? { ...t, status: "completed", outputPath: result.outputPath }
              : t
          )
        );
        alert("Task processed successfully!");
      } else {
        setTasks(
          tasks.map((t) => (t.id === taskId ? { ...t, status: "pending" } : t))
        );
        alert("Failed to process task");
      }
    } catch (error) {
      console.error("Error processing task:", error);
      setTasks(
        tasks.map((t) => (t.id === taskId ? { ...t, status: "pending" } : t))
      );
    }
  };

  const handleExport = async () => {
    if (!videoPath || tasks.length === 0) return;
    setIsExporting(true);
    setExportStatus("Starting export...");
    setExportProgress(0);

    try {
      const updatedTasks = [...tasks];
      for (let i = 0; i < updatedTasks.length; i++) {
        const task = updatedTasks[i];
        if (task.status === "completed" && task.outputPath) continue;
        setExportStatus(
          `Processing Task ${i + 1} of ${updatedTasks.length}...`
        );
        setExportProgress(Math.floor((i / updatedTasks.length) * 100));
        setTasks((prev) =>
          prev.map((t) =>
            t.id === task.id ? { ...t, status: "processing" } : t
          )
        );

        const response = await fetch(`${API_BASE_URL}/process-task`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoPath, task }),
        });
        const result = await response.json();
        if (!result.success) throw new Error("Task failed");

        updatedTasks[i] = {
          ...task,
          status: "completed",
          outputPath: result.outputPath,
        };
        setTasks((prev) =>
          prev.map((t) =>
            t.id === task.id
              ? { ...t, status: "completed", outputPath: result.outputPath }
              : t
          )
        );
      }

      if (mergeTasks && updatedTasks.length > 1) {
        setExportStatus("Merging segments into final video...");
        const sortedTasks = [...updatedTasks].sort(
          (a, b) => a.mergeOrder - b.mergeOrder
        );
        const resp = await fetch(`${API_BASE_URL}/process-tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videoPath,
            tasks: sortedTasks,
            glueOnly: true,
          }),
        });
        const result = await resp.json();
        setExportStatus(`Export Successful! ${result.outputPath}`);
        setExportProgress(100);
        setTasks((prev) =>
          prev.map((t) => ({ ...t, status: "pending", outputPath: undefined }))
        );
      } else {
        setExportStatus("Export finished successfully!");
        setExportProgress(100);
      }
    } catch {
      setExportStatus("Error during export");
      setExportProgress(0);
    } finally {
      setIsExporting(false);
    }
  };

  const startPreview = () => {
    if (!videoPath) return;
    socket.emit("startPreview", { videoPath, filters, seekTime });
  };

  const stopPreview = () => socket.emit("stopPreview");

  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      if (videoPath && previewRunning)
        socket.emit("updateFilters", { filters });
    }, 500);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [filters, videoPath, previewRunning]);

  useEffect(() => {
    fetchVideos();
    socket.on("previewStarted", () => setPreviewRunning(true));
    socket.on("previewStopped", () => setPreviewRunning(false));
    socket.on("previewError", (error) =>
      alert("Preview error: " + error.error)
    );
    return () => {
      socket.off("previewStarted");
      socket.off("previewStopped");
      socket.off("previewError");
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-6">
      <header className="max-w-7xl mx-auto mb-8 flex items-center justify-between border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-linear-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
            360° Editor
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            Advanced 360° Video Correction Suite
          </p>
        </div>
        <div className="flex gap-4 items-center">
          <button
            onClick={handleClearStorage}
            className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-semibold hover:bg-red-100 transition-all shadow-sm"
          >
            Clear Server Storage
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-7 space-y-8">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <VideoSelector
              videoUrl={videoUrl}
              onFileChange={handleFileChange}
              onTimeUpdate={(time) => setSeekTime(formatTime(time))}
              isUploading={isUploading}
              videos={videos}
              onVideoSelect={handleVideoSelect}
              onVideoDelete={handleVideoDelete}
              onUrlDownload={handleUrlDownload}
              isDownloading={isDownloading}
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <PreviewControls
              previewRunning={previewRunning}
              videoPath={videoPath}
              seekTime={seekTime}
              setSeekTime={setSeekTime}
              startPreview={startPreview}
              stopPreview={stopPreview}
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <TaskList
              tasks={tasks}
              selectedTaskId={selectedTaskId}
              setSelectedTaskId={setSelectedTaskId}
              setTasks={setTasks}
              handleLoadTaskFilters={handleLoadTaskFilters}
              processTask={processTask}
              onAddTask={() => handleOpenTaskModal()}
              onEditTask={handleOpenTaskModal}
              mergeTasks={mergeTasks}
            />
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5 space-y-8">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sticky top-6">
            <FilterControls
              filters={filters}
              updateFilter={updateFilter}
              onReset={() => setFilters(defaultFilters)}
              onSaveTaskFilters={handleSaveTaskFilters}
              hasSelectedTask={!!selectedTaskId}
            />

            <div className="mt-8 pt-8 border-t border-slate-100">
              <ExportControls
                isExporting={isExporting}
                exportProgress={exportProgress}
                exportStatus={exportStatus}
                handleExport={handleExport}
                mergeTasks={mergeTasks}
                setMergeTasks={setMergeTasks}
                hasMultipleTasks={tasks.length >= 2}
              />
            </div>
          </div>
        </div>
      </main>

      <TaskModal
        show={showTaskModal}
        editingTask={editingTask}
        tempTaskData={tempTaskData}
        setTempTaskData={setTempTaskData}
        onSave={handleSaveTaskData}
        onClose={closeTaskModal}
      />
    </div>
  );
}

export default App;
