import React from 'react';
import type { Task } from '../types';

interface TaskListProps {
  tasks: Task[];
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;
  setTasks: (tasks: Task[]) => void;
  handleLoadTaskFilters: (task: Task) => void;
  processTask: (taskId: string) => void;
  onAddTask: () => void;
}

const TaskList: React.FC<TaskListProps> = ({
  tasks,
  selectedTaskId,
  setSelectedTaskId,
  setTasks,
  handleLoadTaskFilters,
  processTask,
  onAddTask
}) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Segment Tasks</h2>
        <button
          onClick={onAddTask}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          + Add Task
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="text-gray-500 text-sm">
          No tasks yet. Click "Add Task" to create segments with different parameters.
        </div>
      ) : (
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {tasks.map((task) => (
            <div key={task.id} className="border rounded-lg p-4 bg-gray-50">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="radio"
                      name="selectedTask"
                      checked={selectedTaskId === task.id}
                      onChange={() => setSelectedTaskId(task.id)}
                      className="w-4 h-4"
                    />
                    <span className="font-semibold">Task {task.id.slice(-8)}</span>
                    {task.status === 'completed' && (
                      <span className="ml-2 text-sm text-green-600">✓ Done</span>
                    )}
                    {task.status === 'processing' && (
                      <span className="ml-2 text-sm text-blue-600">⏳ Processing</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    <strong>Time:</strong> {task.startTime} - {task.endTime}
                  </div>
                  <div className="text-sm text-gray-600">
                    <strong>Quality:</strong> {task.quality}
                  </div>
                </div>
                <button
                  onClick={() => setTasks(tasks.filter((t) => t.id !== task.id))}
                  className="ml-2 text-red-600 hover:text-red-700"
                >
                  ✕
                </button>
              </div>

              {selectedTaskId === task.id && (
                <div className="mt-3 pt-3 border-t space-y-3">
                  <h4 className="font-semibold text-sm mb-2">Parameters for this task:</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <strong>Crop 1:</strong> {task.filters.crop1.width}x{task.filters.crop1.height}
                    </div>
                    <div>
                      <strong>V360 FOV:</strong> {task.filters.v360.h_fov}°/{task.filters.v360.v_fov}°
                    </div>
                    <div>
                      <strong>Lens K1/K2:</strong> {task.filters.lenscorrection.k1}/{task.filters.lenscorrection.k2}
                    </div>
                    <div>
                      <strong>Crop 2:</strong> {task.filters.crop2.width}x{task.filters.crop2.height}
                    </div>
                    <div>
                      <strong>Yaw:</strong> {task.filters.v360.yaw}°
                    </div>
                    <div>
                      <strong>Pitch:</strong> {task.filters.v360.pitch}°
                    </div>
                    <div>
                      <strong>Roll:</strong> {task.filters.v360.roll}°
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleLoadTaskFilters(task)}
                      className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
                    >
                      Load Filters
                    </button>
                    <button
                      onClick={() => processTask(task.id)}
                      disabled={task.status !== 'pending'}
                      className="flex-1 bg-green-600 text-white px-3 py-2 rounded text-sm disabled:bg-gray-400 hover:bg-green-700"
                    >
                      {task.status === 'processing' ? 'Processing...' : 'Process'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskList;
