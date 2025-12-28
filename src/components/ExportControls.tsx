import React from 'react';

interface ExportControlsProps {
  isExporting: boolean;
  exportProgress: number;
  exportStatus: string;
  handleExport: () => void;
  mergeTasks: boolean;
  setMergeTasks: (val: boolean) => void;
  hasMultipleTasks: boolean;
}

const ExportControls: React.FC<ExportControlsProps> = ({
  isExporting,
  exportProgress,
  exportStatus,
  handleExport,
  mergeTasks,
  setMergeTasks,
  hasMultipleTasks
}) => {
  return (
    <div className="bg-white rounded-lg shadow-xl p-6 border border-gray-100">
      <h2 className="text-xl font-bold mb-6 text-gray-800 flex items-center">
        <span className="bg-blue-100 text-blue-600 p-2 rounded-lg mr-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </span>
        Export
      </h2>
      <div className="space-y-6">
        {/* Merge Checkbox */}
        <div className={`p-4 rounded-xl border transition-all duration-200 ${mergeTasks ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200 opacity-60'}`}>
          <label className="flex items-start cursor-pointer group">
            <div className="relative flex items-center mt-1">
              <input
                type="checkbox"
                checked={mergeTasks}
                onChange={(e) => setMergeTasks(e.target.checked)}
                disabled={isExporting || !hasMultipleTasks}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
              />
            </div>
            <div className="ml-3">
              <span className={`text-sm font-semibold block ${mergeTasks ? 'text-blue-900' : 'text-gray-700'}`}>
                Combine all tasks into one video
              </span>
              <span className="text-xs text-gray-500 mt-1 block leading-relaxed">
                {hasMultipleTasks 
                  ? "Glue individual task segments together into a single final sequence."
                  : "Need at least 2 tasks to enable combining."}
              </span>
            </div>
          </label>
        </div>

        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="group relative w-full overflow-hidden rounded-xl bg-blue-600 px-4 py-4 font-bold text-white transition-all hover:bg-blue-700 hover:shadow-lg active:scale-[0.98] disabled:bg-gray-400 disabled:shadow-none"
        >
          <div className="flex items-center justify-center space-x-2">
            {isExporting ? (
              <>
                <svg className="h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <span>Start Export</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-hover:translate-x-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </>
            )}
          </div>
        </button>

        {isExporting && (
          <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex justify-between text-sm mb-2 font-medium text-gray-600">
              <span>Progress</span>
              <span className="text-blue-600">{exportProgress}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden border border-gray-200">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(37,99,235,0.4)]"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
          </div>
        )}

        <div className={`mt-4 p-4 rounded-xl text-sm border-2 ${exportStatus.includes('failed') || exportStatus.includes('Error') ? 'bg-red-50 border-red-100 text-red-700' : 'bg-gray-50 border-gray-100 text-gray-700 font-medium'}`}>
          <div className="flex items-start">
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-3 mt-0.5 ${exportStatus.includes('failed') || exportStatus.includes('Error') ? 'text-red-500' : 'text-gray-400'}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <span className="uppercase text-[10px] tracking-wider font-bold block mb-1 opacity-60 text-gray-500">System Status</span>
              {exportStatus}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportControls;
