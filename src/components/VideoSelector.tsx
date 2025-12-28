import React, { type ChangeEvent } from "react";

interface VideoSelectorProps {
  videoUrl: string | null;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  isUploading: boolean;
}

const VideoSelector: React.FC<VideoSelectorProps> = ({
  videoUrl,
  onFileChange,
  isUploading,
}) => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 transition-all hover:shadow-xl">
      <h2 className="text-xl font-bold mb-6 text-gray-800 flex items-center">
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

      <div className="relative group">
        <input
          type="file"
          accept="video/*"
          onChange={onFileChange}
          disabled={isUploading}
          className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mb-6 border border-gray-100 rounded-xl p-2 bg-gray-50/50"
        />

        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-[1px] rounded-xl z-10 transition-all duration-300">
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-indigo-100 rounded-full"></div>
                <div className="w-12 h-12 border-4 border-t-indigo-600 rounded-full animate-spin absolute top-0 left-0"></div>
              </div>
              <span className="mt-4 text-sm font-bold text-indigo-700 animate-pulse uppercase tracking-wider">
                Uploading video...
              </span>
            </div>
          </div>
        )}
      </div>

      {videoUrl && !isUploading && (
        <div className="animate-in fade-in zoom-in-95 duration-500 mt-2">
          <div className="relative rounded-2xl overflow-hidden shadow-inner bg-black ring-1 ring-gray-200">
            <video src={videoUrl} controls className="w-full aspect-video" />
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoSelector;
