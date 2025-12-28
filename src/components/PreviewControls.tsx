import React from 'react';

interface PreviewControlsProps {
  previewRunning: boolean;
  videoPath: string;
  seekTime: string;
  setSeekTime: (time: string) => void;
  startPreview: () => void;
  stopPreview: () => void;
}

const PreviewControls: React.FC<PreviewControlsProps> = ({
  previewRunning,
  videoPath,
  seekTime,
  setSeekTime,
  startPreview,
  stopPreview
}) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Preview Controls (ffplay)</h2>
      <div className="space-y-4">
        <div className="flex gap-2">
          <button
            onClick={startPreview}
            disabled={previewRunning || !videoPath}
            className="flex-1 bg-green-600 text-white px-4 py-2 rounded disabled:bg-gray-400 hover:bg-green-700"
          >
            ▶ Play Preview
          </button>
          <button
            onClick={stopPreview}
            disabled={!previewRunning}
            className="flex-1 bg-red-600 text-white px-4 py-2 rounded disabled:bg-gray-400 hover:bg-red-700"
          >
            ⏸ Stop Preview
          </button>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Seek Time (HH:MM:SS)</label>
          <input
            type="text"
            value={seekTime}
            onChange={(e) => setSeekTime(e.target.value)}
            placeholder="00:00:00"
            className="w-full border rounded px-3 py-2"
          />
        </div>
        {previewRunning && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-green-600">Preview Running (ffplay window open)</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PreviewControls;
