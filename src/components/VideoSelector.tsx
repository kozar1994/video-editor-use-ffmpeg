import React, { useState, type ChangeEvent } from "react";
import type { VideoFile } from "../types";

interface VideoSelectorProps {
  videoUrl: string | null;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  isUploading: boolean;
  onTimeUpdate?: (time: number) => void;
  videos: VideoFile[];
  onVideoSelect: (video: VideoFile) => void;
  onVideoDelete: (video: VideoFile) => void;
  onUrlDownload: (url: string) => void;
  isDownloading: boolean;
}

const VideoSelector: React.FC<VideoSelectorProps> = ({
  videoUrl,
  onFileChange,
  isUploading,
  onTimeUpdate,
  videos,
  onVideoSelect,
  onVideoDelete,
  onUrlDownload,
  isDownloading,
}) => {
  const [urlInput, setUrlInput] = useState("");

  const handleDownload = () => {
    if (urlInput.trim()) {
      onUrlDownload(urlInput.trim());
      setUrlInput("");
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 transition-all hover:shadow-xl">
      <h2 className="text-xl font-bold mb-6 text-slate-900 flex items-center">
        <span className="bg-indigo-100 text-indigo-600 p-2 rounded-lg mr-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
          </svg>
        </span>
        Video Selection
      </h2>

      <div className="mb-8">
        {/* Local Upload and URL Download */}
        <div className="space-y-6 max-w-2xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="relative group">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Upload Local Video
              </label>
              <input
                type="file"
                accept="video/*"
                onChange={onFileChange}
                disabled={isUploading || isDownloading}
                className="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border border-gray-100 rounded-xl p-2 bg-gray-50/50"
              />
            </div>

            <div className="relative">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Download from URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/video.mp4"
                  disabled={isUploading || isDownloading}
                  className="flex-1 text-sm border border-gray-100 rounded-xl px-4 py-2 bg-gray-50/50 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <button
                  onClick={handleDownload}
                  disabled={!urlInput || isUploading || isDownloading}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  Download
                </button>
              </div>
            </div>
          </div>

          {(isUploading || isDownloading) && (
            <div className="flex flex-col items-center justify-center p-8 bg-indigo-50/30 rounded-2xl border border-indigo-100 animate-in fade-in zoom-in-95">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-indigo-100 rounded-full"></div>
                <div className="w-12 h-12 border-4 border-t-indigo-600 rounded-full animate-spin absolute top-0 left-0"></div>
              </div>
              <span className="mt-4 text-sm font-bold text-indigo-700 animate-pulse uppercase tracking-wider">
                {isUploading ? "Uploading video..." : "Downloading video..."}
              </span>
            </div>
          )}
        </div>
      </div>

      {videoUrl && !isUploading && !isDownloading && (
        <div className="animate-in fade-in zoom-in-95 duration-500 mb-8">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-black ring-1 ring-gray-200 group/player">
            <video
              src={videoUrl}
              controls
              className="w-full aspect-video"
              onTimeUpdate={(e) => onTimeUpdate?.(e.currentTarget.currentTime)}
            />
            <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 text-white text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover/player:opacity-100 transition-opacity">
              Live Preview
            </div>
          </div>
        </div>
      )}

      {/* Video Library */}
      <div className="border border-slate-100 rounded-2xl p-6 bg-slate-50/50">
        <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
            />
          </svg>
          Available Videos
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          {videos.length === 0 ? (
            <p className="text-sm text-slate-500 italic py-4 col-span-full">
              No videos found in library
            </p>
          ) : (
            videos.map((video) => (
              <div key={video.path} className="group relative">
                <button
                  onClick={() => onVideoSelect(video)}
                  className="w-full text-left p-3 rounded-xl border border-white bg-white hover:border-indigo-300 hover:shadow-md transition-all flex items-center justify-between"
                >
                  <div className="flex items-center min-w-0 pr-6">
                    <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center mr-3 group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 001.664-1.664l-3-2z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="truncate">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {video.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {(video.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (
                      window.confirm(
                        `Are you sure you want to delete ${video.name}?`
                      )
                    ) {
                      onVideoDelete(video);
                    }
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  title="Delete Video"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoSelector;
