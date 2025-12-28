export interface FilterParams {
  crop1: { width: string; height: string; x: string; y: string };
  v360: { input: string; output: string; ih_fov: number; iv_fov: number; h_fov: number; v_fov: number; yaw: number; pitch: number; roll: number };
  lenscorrection: { k1: number; k2: number };
  crop2: { width: string; height: string; x: string; y: string };
  scale: { width: string; height: string; flags: string };
  hqdn3d: { spatial_luma: number; spatial_chroma: number; temporal_luma: number; temporal_chroma: number };
  unsharp: { luma_msize_x: number; luma_msize_y: number; luma_amount: number };
  format: string;
  setsar: number;
}

export interface VideoMetadata {
  duration: number; // seconds
  width: number;
  height: number;
  format?: string;
}

export interface ExportOptions {
  quality: 'fast'|'medium'|'high';
  startTime?: number; // seconds
  endTime?: number; // seconds
  outputPath?: string;
}

export type SocketEvent =
  | 'selectVideo'
  | 'updateFilters'
  | 'previewSeek'
  | 'previewPlay'
  | 'previewPause'
  | 'startExport'
  | 'cancelExport';
