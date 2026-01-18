import React from 'react';
import type { Task } from '../types';

interface TaskModalProps {
  show: boolean;
  editingTask: Task | null;
  tempTaskData: Partial<Task>;
  setTempTaskData: (data: Partial<Task>) => void;
  onSave: () => void;
  onClose: () => void;
}

const TaskModal: React.FC<TaskModalProps> = ({
  show,
  editingTask,
  tempTaskData,
  setTempTaskData,
  onSave,
  onClose
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md border border-slate-100">
        <h2 className="text-2xl font-bold mb-6 text-slate-900">
          {editingTask ? "Edit Segment" : "Add New Segment"}
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Start Time</label>
            <input
              type="text"
              value={tempTaskData.startTime || ""}
              onChange={(e) =>
                setTempTaskData({ ...tempTaskData, startTime: e.target.value })
              }
              placeholder="00:00:00"
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Time</label>
            <input
              type="text"
              value={tempTaskData.endTime || ""}
              onChange={(e) =>
                setTempTaskData({ ...tempTaskData, endTime: e.target.value })
              }
              placeholder="00:00:05"
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Quality</label>
            <select
              value={tempTaskData.quality || "medium"}
              onChange={(e) =>
                setTempTaskData({
                  ...tempTaskData,
                  quality: e.target.value as Task["quality"],
                })
              }
              className="w-full border rounded px-3 py-2"
            >
              <option value="fast">Fast</option>
              <option value="medium">Medium</option>
              <option value="high">High Quality</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={onSave}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Save Task
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 text-slate-800 px-4 py-2 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskModal;
