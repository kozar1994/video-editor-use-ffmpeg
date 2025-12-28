import type { FilterParams } from './types'

// Default filter params matching the initial command
export const defaultFilterParams: FilterParams = {
  crop1: { width: 'iw/2', height: 'ih', x: 'iw/2', y: '0' },
  v360: { input: 'e', output: 'rectilinear', ih_fov: 140, iv_fov: 140, h_fov: 98, v_fov: 98, yaw: 0, pitch: 0, roll: 0 },
  lenscorrection: { k1: 0.8, k2: -0.08 },
  crop2: { width: 'iw*0.85', height: 'ih*0.85', x: '(iw-iw*0.85)/2', y: '(ih-ih*0.85)/2' },
  scale: { width: 'iw', height: 'ih', flags: 'lanczos' },
  hqdn3d: { spatial_luma: 1.0, spatial_chroma: 0.8, temporal_luma: 6, temporal_chroma: 4 },
  unsharp: { luma_msize_x: 3, luma_msize_y: 3, luma_amount: 0.5 },
  format: 'yuv420p',
  setsar: 1
}

export function buildFilterString(params: FilterParams): string {
  // This is a simplified placeholder renderer; real implementation would
  // construct a robust ffmpeg -vf string from the nested params.
  const parts: string[] = []
  // crop1
  parts.push(`crop=${params.crop1.width}:${params.crop1.height}:${params.crop1.x}:${params.crop1.y}`)
  // v360 (simplified, real string needs careful formatting)
  parts.push(`v360=input=${params.v360.input}:output=${params.v360.output}:ih_fov=${params.v360.ih_fov}:iv_fov=${params.v360.iv_fov}:h_fov=${params.v360.h_fov}:v_fov=${params.v360.v_fov}:yaw=${params.v360.yaw}:pitch=${params.v360.pitch}:roll=${params.v360.roll}`)
  // lens correction
  parts.push(`lenscorrection=k1=${params.lenscorrection.k1}:k2=${params.lenscorrection.k2}`)
  // crop2
  parts.push(`crop=${params.crop2.width}:${params.crop2.height}:${params.crop2.x}:${params.crop2.y}`)
  // scale and others can be appended similarly
  parts.push(`scale=${params.scale.width}:${params.scale.height}:flags=${params.scale.flags}`)
  parts.push(`hqdn3d=${params.hqdn3d.spatial_luma}:${params.hqdn3d.spatial_chroma}:${params.hqdn3d.temporal_luma}:${params.hqdn3d.temporal_chroma}`)
  parts.push(`unsharp=${params.unsharp.luma_msize_x}:${params.unsharp.luma_msize_y}:${params.unsharp.luma_amount}`)
  parts.push(`format=${params.format}`)
  parts.push(`setsar=${params.setsar}`)
  return parts.filter(Boolean).join(', ')
}
