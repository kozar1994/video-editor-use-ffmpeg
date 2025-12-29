import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import { socket } from './lib/socket';
import type { FilterParams, Task } from "./types";
import VideoSelector from "./components/VideoSelector";
import PreviewControls from "./components/PreviewControls";
import TaskList from "./components/TaskList";
import FilterControls from "./components/FilterControls";
import ExportControls from "./components/ExportControls";
import TaskModal from "./components/TaskModal";

const defaultFilters: FilterParams = {
  crop1: { width: "iw/2", height: "ih", x: "iw/2", y: "0" },
  v360: {
    input: "e",
    output: "rectilinear",
    ih_fov: 140,
    iv_fov: 140,
    h_fov: 98,
    v_fov: 98,
    yaw: 0,
    pitch: 0,
    roll: 0,
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
    spatial_luma: 1.0,
    spatial_chroma: 0.8,
    temporal_luma: 6,
    temporal_chroma: 4,
  },
  unsharp: { luma_msize_x: 3, luma_msize_y: 3, luma_amount: 0.5 },
  format: "yuv420p",
  setsar: 1,
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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showTaskModal, setShowTaskModal] = useState<boolean>(false);
  const [tempTaskData, setTempTaskData] = useState<Partial<Task>>({});
  const [mergeTasks, setMergeTasks] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setIsUploading(true);
      const url = URL.createObjectURL(f);
      setVideoUrl(url);

      const formData = new FormData();
      formData.append("video", f);

      try {
        const response = await fetch("http://localhost:3001/upload", {
          method: "POST",
          body: formData,
        });
        const result = await response.json();
        setVideoPath(result.path);

        console.log(
          "Video uploaded:",
          result.path,
          "Duration:",
          result.formattedDuration
        );
      } catch (error) {
        console.error("Upload error:", error);
        alert("Failed to upload video to server");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const updateFilter = (
    filter: keyof FilterParams,
    key: string,
    value: string | number
  ) => {
    setFilters((prev) => {
      const obj = prev[filter] as Record<string, string | number>;
      const newObj = { ...obj, [key]: value };
      return { ...prev, [filter]: newObj as any };
    });
  };

  const handleVideoTimeUpdate = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const formatted = `${String(h).padStart(2, "0")}:${String(m).padStart(
      2,
      "0"
    )}:${String(s).padStart(2, "0")}`;
    setSeekTime(formatted);
  };

  const handleOpenTaskModal = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setTempTaskData(task);
    } else {
      setEditingTask(null);
      setTempTaskData({
        startTime: "00:00:00",
        endTime: "00:05:00",
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
            ? { ...t, ...tempTaskData, status: "pending" }
            : t
        )
      );
    } else {
      const newTask: Task = {
        id: `task-${Date.now()}`,
        startTime: tempTaskData.startTime!,
        endTime: tempTaskData.endTime!,
        filters: tempTaskData.filters || { ...filters },
        quality: tempTaskData.quality || "medium",
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
        "This will permanently delete ALL uploaded videos and exported tasks from the server. Are you sure?"
      )
    ) {
      return;
    }

    try {
      const response = await fetch("http://localhost:3001/clear-files", {
        method: "POST",
      });
      if (response.ok) {
        const result = await response.json();
        alert(`Storage cleared! Deleted ${result.deletedCount} files.`);
        // Reset local state
        setVideoUrl(null);
        setVideoPath("");
        setTasks([]);
        setExportStatus("Storage cleared");
        setExportProgress(0);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Server error response:", errorData);
        alert(
          `Failed to clear storage: ${
            errorData.message || errorData.error || response.statusText
          }`
        );
      }
    } catch (err) {
      console.error("Clear storage error:", err);
      alert("Error clearing storage");
    }
  };

  const handleLoadTaskFilters = (task: Task) => {
    setFilters(task.filters);
  };

  const handleSaveTaskFilters = () => {
    if (!selectedTaskId) return;
    setTasks(
      tasks.map((t) =>
        t.id === selectedTaskId
          ? { ...t, filters: { ...filters }, status: "pending" }
          : t
      )
    );
    alert("Filters saved to task! It will be re-processed on next export.");
  };

  const processTask = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || !videoPath) return;

    try {
      setTasks(
        tasks.map((t) => (t.id === taskId ? { ...t, status: "processing" } : t))
      );

      const requestBody = {
        videoPath,
        task,
      };

      console.log("Sending request body:", requestBody);

      const response = await fetch("http://localhost:3001/process-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      console.log("Response status:", response.status);

      if (response.ok) {
        const result = await response.json();
        console.log("Response data:", result);
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
            tasks.map((t) =>
              t.id === taskId ? { ...t, status: "pending" } : t
            )
          );
          alert(
            "Failed to process task: " + (result.message || "Unknown error")
          );
        }
      } else {
        const errorData = await response.json();
        console.log("Error response:", errorData);
        setTasks(
          tasks.map((t) => (t.id === taskId ? { ...t, status: "pending" } : t))
        );
        alert("Failed to process task: " + (errorData.error || "Server error"));
      }
    } catch (error) {
      console.error("Error processing task:", error);
      setTasks(
        tasks.map((t) => (t.id === taskId ? { ...t, status: "pending" } : t))
      );
      alert(
        "Error processing task: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    }
  };

  const handleExport = async () => {
    if (!videoPath) {
      alert("Please upload a video first");
      return;
    }
    if (tasks.length === 0) {
      alert("No tasks to export");
      return;
    }

    setIsExporting(true);
    setExportStatus("Starting export...");
    setExportProgress(0);

    try {
      const updatedTasks = [...tasks];

      // 1. Sequentially process all pending tasks
      for (let i = 0; i < updatedTasks.length; i++) {
        const task = updatedTasks[i];

        // Skip if already completed and has a valid output
        if (task.status === "completed" && task.outputPath) {
          continue;
        }

        const taskLabel = `Task ${i + 1}`;
        setExportStatus(`Processing ${taskLabel} of ${updatedTasks.length}...`);
        setExportProgress(Math.floor((i / updatedTasks.length) * 100));

        // Mark as processing in main task list
        setTasks((prev) =>
          prev.map((t) =>
            t.id === task.id ? { ...t, status: "processing" } : t
          )
        );

        const response = await fetch("http://localhost:3001/process-task", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoPath, task }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            `${taskLabel} failed: ${errorData.error || "Server error"}`
          );
        }

        const result = await response.json();
        if (!result.success) {
          throw new Error(
            `${taskLabel} failed: ${result.message || "Unknown error"}`
          );
        }

        // Update local list for the final merge step and update global state
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

      setExportProgress(90);

      // 2. Perform final merge if checkbox is checked
      if (mergeTasks && updatedTasks.length > 1) {
        setExportStatus("Gluing all processed segments into final video...");

        // Sort tasks based on user-defined mergeOrder
        const sortedTasks = [...updatedTasks].sort(
          (a, b) => a.mergeOrder - b.mergeOrder
        );

        const resp = await fetch("http://localhost:3001/process-tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videoPath,
            tasks: sortedTasks,
            glueOnly: true,
          }),
        });

        if (!resp.ok) {
          const errorData = await resp.json();
          throw new Error(
            "Merge step failed: " + (errorData.error || "Server error")
          );
        }

        const result = await resp.json();
        setExportStatus(
          `Export Successful! Merged video: ${result.outputPath}`
        );
        setExportProgress(100);

        // Mark tasks as pending again since segments were deleted on server
        setTasks((prev) =>
          prev.map((t) => ({ ...t, status: "pending", outputPath: undefined }))
        );
      } else if (mergeTasks && updatedTasks.length <= 1) {
        setExportStatus(
          "Export finished. (Only one task, so no merging needed)"
        );
        setExportProgress(100);
      } else {
        setExportStatus("All individual tasks processed successfully!");
        setExportProgress(100);
      }
    } catch (err) {
      console.error("Export sequence error:", err);
      setExportStatus(
        err instanceof Error ? err.message : "Error during export"
      );
      setExportProgress(0);
    }

    setIsExporting(false);
  };

  const startPreview = () => {
    if (!videoPath) {
      alert("Please select a video first");
      return;
    }

    socket.emit("startPreview", {
      videoPath,
      filters,
      seekTime,
    });
  };

  const stopPreview = () => {
    socket.emit("stopPreview");
  };

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (videoPath && previewRunning) {
        socket.emit("updateFilters", { filters });
      }
    }, 500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [filters, videoPath, previewRunning]);

  useEffect(() => {
    socket.on("previewStarted", () => {
      console.log("Preview started");
      setPreviewRunning(true);
    });

    socket.on("previewStopped", () => {
      console.log("Preview stopped");
      setPreviewRunning(false);
    });

    socket.on("previewError", (error) => {
      console.error("Preview error:", error);
      alert("Preview error: " + error.error);
    });

    return () => {
      socket.off("previewStarted");
      socket.off("previewStopped");
      socket.off("previewError");
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">
            Video Filter Editor
          </h1>
          <button
            onClick={handleClearStorage}
            className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-lg font-semibold hover:bg-red-100 transition-colors border border-red-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            Clear Storage
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Column - Video and Controls */}
          <div className="lg:col-span-2 space-y-8">
            <VideoSelector
              videoUrl={videoUrl}
              onFileChange={onFileChange}
              isUploading={isUploading}
              onTimeUpdate={handleVideoTimeUpdate}
            />

            <PreviewControls
              previewRunning={previewRunning}
              videoPath={videoPath}
              seekTime={seekTime}
              setSeekTime={setSeekTime}
              startPreview={startPreview}
              stopPreview={stopPreview}
            />

            <FilterControls
              filters={filters}
              updateFilter={updateFilter}
              onReset={() => setFilters(defaultFilters)}
              onSaveTaskFilters={handleSaveTaskFilters}
              hasSelectedTask={!!selectedTaskId}
            />
          </div>

          {/* Sidebar - Task Management and Export */}
          <div className="lg:col-span-1 space-y-8">
            <ExportControls
              isExporting={isExporting}
              exportProgress={exportProgress}
              exportStatus={exportStatus}
              handleExport={handleExport}
              mergeTasks={mergeTasks}
              setMergeTasks={setMergeTasks}
              hasMultipleTasks={tasks.length > 1}
            />

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
      </div>

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
