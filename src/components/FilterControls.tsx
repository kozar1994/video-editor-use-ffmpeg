import React from 'react';
import type { FilterParams } from '../types';

interface FilterControlsProps {
  filters: FilterParams;
  updateFilter: (filter: keyof FilterParams, key: string, value: string | number) => void;
  onReset: () => void;
  onSaveTaskFilters?: () => void;
  hasSelectedTask?: boolean;
}

const FilterControls: React.FC<FilterControlsProps> = ({ filters, updateFilter, onReset, onSaveTaskFilters, hasSelectedTask }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Filter Parameters</h2>
        <div className="flex gap-2">
          {hasSelectedTask && onSaveTaskFilters && (
            <button
              onClick={onSaveTaskFilters}
              className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
            >
              Save to Task
            </button>
          )}
          <button
            onClick={onReset}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Reset to Defaults
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Crop Filter 1 */}
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Crop Filter 1</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Width</label>
              <input
                type="text"
                value={filters.crop1.width}
                onChange={(e) => updateFilter('crop1', 'width', e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Height</label>
              <input
                type="text"
                value={filters.crop1.height}
                onChange={(e) => updateFilter('crop1', 'height', e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">X</label>
              <input
                type="text"
                value={filters.crop1.x}
                onChange={(e) => updateFilter('crop1', 'x', e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Y</label>
              <input
                type="text"
                value={filters.crop1.y}
                onChange={(e) => updateFilter('crop1', 'y', e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* V360 Filter */}
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-3">V360 Filter</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm mb-1">Input</label>
              <input
                type="text"
                value={filters.v360.input}
                onChange={(e) => updateFilter('v360', 'input', e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Output</label>
              <input
                type="text"
                value={filters.v360.output}
                onChange={(e) => updateFilter('v360', 'output', e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">IH FOV</label>
              <input
                type="number"
                value={filters.v360.ih_fov}
                onChange={(e) => updateFilter('v360', 'ih_fov', parseFloat(e.target.value) || 0)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">IV FOV</label>
              <input
                type="number"
                value={filters.v360.iv_fov}
                onChange={(e) => updateFilter('v360', 'iv_fov', parseFloat(e.target.value) || 0)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">H FOV</label>
              <input
                type="number"
                value={filters.v360.h_fov}
                onChange={(e) => updateFilter('v360', 'h_fov', parseFloat(e.target.value) || 0)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">V FOV</label>
              <input
                type="number"
                value={filters.v360.v_fov}
                onChange={(e) => updateFilter('v360', 'v_fov', parseFloat(e.target.value) || 0)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Yaw</label>
              <input
                type="number"
                value={filters.v360.yaw}
                onChange={(e) => updateFilter('v360', 'yaw', parseFloat(e.target.value) || 0)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Pitch</label>
              <input
                type="number"
                value={filters.v360.pitch}
                onChange={(e) => updateFilter('v360', 'pitch', parseFloat(e.target.value) || 0)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Roll</label>
              <input
                type="number"
                value={filters.v360.roll}
                onChange={(e) => updateFilter('v360', 'roll', parseFloat(e.target.value) || 0)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* Lens Correction */}
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Lens Correction</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">K1</label>
              <input
                type="number"
                step="0.01"
                value={filters.lenscorrection.k1}
                onChange={(e) => updateFilter('lenscorrection', 'k1', parseFloat(e.target.value) || 0)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">K2</label>
              <input
                type="number"
                step="0.01"
                value={filters.lenscorrection.k2}
                onChange={(e) => updateFilter('lenscorrection', 'k2', parseFloat(e.target.value) || 0)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* Crop Filter 2 */}
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Crop Filter 2</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Width</label>
              <input
                type="text"
                value={filters.crop2.width}
                onChange={(e) => updateFilter('crop2', 'width', e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Height</label>
              <input
                type="text"
                value={filters.crop2.height}
                onChange={(e) => updateFilter('crop2', 'height', e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">X</label>
              <input
                type="text"
                value={filters.crop2.x}
                onChange={(e) => updateFilter('crop2', 'x', e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Y</label>
              <input
                type="text"
                value={filters.crop2.y}
                onChange={(e) => updateFilter('crop2', 'y', e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* Scale */}
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Scale</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm mb-1">Width</label>
              <input
                type="text"
                value={filters.scale.width}
                onChange={(e) => updateFilter('scale', 'width', e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Height</label>
              <input
                type="text"
                value={filters.scale.height}
                onChange={(e) => updateFilter('scale', 'height', e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Flags</label>
              <input
                type="text"
                value={filters.scale.flags}
                onChange={(e) => updateFilter('scale', 'flags', e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* HQDN3D */}
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-3">HQDN3D (Denoise)</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Spatial Luma</label>
              <input
                type="number"
                step="0.1"
                value={filters.hqdn3d.spatial_luma}
                onChange={(e) => updateFilter('hqdn3d', 'spatial_luma', parseFloat(e.target.value) || 0)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Spatial Chroma</label>
              <input
                type="number"
                step="0.1"
                value={filters.hqdn3d.spatial_chroma}
                onChange={(e) => updateFilter('hqdn3d', 'spatial_chroma', parseFloat(e.target.value) || 0)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Temporal Luma</label>
              <input
                type="number"
                step="0.1"
                value={filters.hqdn3d.temporal_luma}
                onChange={(e) => updateFilter('hqdn3d', 'temporal_luma', parseFloat(e.target.value) || 0)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Temporal Chroma</label>
              <input
                type="number"
                step="0.1"
                value={filters.hqdn3d.temporal_chroma}
                onChange={(e) => updateFilter('hqdn3d', 'temporal_chroma', parseFloat(e.target.value) || 0)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* Unsharp */}
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Unsharp</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm mb-1">Luma Msize X</label>
              <input
                type="number"
                value={filters.unsharp.luma_msize_x}
                onChange={(e) => updateFilter('unsharp', 'luma_msize_x', parseFloat(e.target.value) || 0)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Luma Msize Y</label>
              <input
                type="number"
                value={filters.unsharp.luma_msize_y}
                onChange={(e) => updateFilter('unsharp', 'luma_msize_y', parseFloat(e.target.value) || 0)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Luma Amount</label>
              <input
                type="number"
                step="0.1"
                value={filters.unsharp.luma_amount}
                onChange={(e) => updateFilter('unsharp', 'luma_amount', parseFloat(e.target.value) || 0)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* Format & SAR */}
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Format & Aspect Ratio</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Format</label>
              <input
                type="text"
                value={filters.format}
                onChange={(e) => updateFilter('format', 'format', e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">SetSAR</label>
              <input
                type="number"
                step="0.1"
                value={filters.setsar}
                onChange={(e) => updateFilter('setsar', 'setsar', parseFloat(e.target.value) || 0)}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterControls;
