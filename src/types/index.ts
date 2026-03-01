export type CropMode = 'free' | 'ratio' | 'custom'

export type ExportFormat = 'jpg' | 'png' | 'webp'

export type FaceDetectStatus = 'idle' | 'loading' | 'detecting' | 'done' | 'error'

export type CropPreset =
  | 'FreeForm'
  | 'Custom'
  | 'Square'
  | 'Monitor'
  | 'Widescreen'
  | 'Panorama'
  | 'Film'
  | 'Cinemascope'
  | 'Facebookprofile'
  | 'Facebookcover'
  | 'Facebookpost'
  | 'Facebookad'
  | 'Instagramprofile'
  | 'Instagrampost'
  | 'Instagramstory'
  | 'Twitterprofile'
  | 'Twitterheader'
  | 'Twitterimage'
  | 'Twittercard'
  | 'Twitterad'
  | 'Youtubeprofile'
  | 'Youtubechannelart'
  | 'Youtubethumb'
  | 'Webmini'
  | 'Websmall'
  | 'Webcommon'
  | 'Webmedium'
  | 'FllHD'
  | 'UltraHD'
  | 'PaperA4'
  | 'PaperA5'
  | 'PaperA6'
  | 'Paperletter'

export interface PresetConfig {
  key: CropPreset
  label: string
  ratio: number | null   // width / height, null = unconstrained
  refWidth: number | null
  refHeight: number | null
}

export interface CropData {
  x: number
  y: number
  width: number
  height: number
}

export interface FaceDetection {
  x: number
  y: number
  width: number
  height: number
  confidence: number
}

export interface HistoryEntry {
  cropData: CropData | null
  cropMode: CropMode
  selectedPreset: CropPreset | null
  aspectRatio: number | null
  rotation: number
  flipH: boolean
  flipV: boolean
}

export interface BatchFile {
  id: string
  file: File
  status: 'waiting' | 'processing' | 'done' | 'failed'
  resultUrl?: string
  error?: string
  outputWidth?: number
  outputHeight?: number
}
