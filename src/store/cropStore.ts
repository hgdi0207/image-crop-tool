import { create } from 'zustand'
import {
  CropMode, CropPreset, CropData,
  ExportFormat, FaceDetectStatus,
  FaceDetection, HistoryEntry, BatchFile,
} from '@/types'
import { MAX_HISTORY_STEPS } from '@/lib/constants'

interface CropStore {
  // 图片状态
  originalFile: File | null
  correctedDataUrl: string | null

  // 裁剪状态
  cropMode: CropMode
  selectedPreset: CropPreset | null
  aspectRatio: number | null
  cropData: CropData | null

  // 预处理状态
  rotation: number
  flipH: boolean
  flipV: boolean

  // AI 状态
  faceDetectStatus: FaceDetectStatus
  faceDetections: FaceDetection[]
  focusedFaceIndex: number

  // 撤销/重做
  history: HistoryEntry[]
  historyIndex: number

  // 导出设置
  exportFormat: ExportFormat
  exportQuality: number
  exportFilename: string
  exportBgColor: string

  // 批量处理
  batchFiles: BatchFile[]

  // Actions
  setImage: (file: File, dataUrl: string) => void
  clearImage: () => void
  setCropMode: (mode: CropMode) => void
  setSelectedPreset: (preset: CropPreset | null, ratio: number | null) => void
  setCropData: (data: CropData | null) => void
  setRotation: (deg: number) => void
  setFlipH: (v: boolean) => void
  setFlipV: (v: boolean) => void
  resetAdjustments: () => void
  setFaceDetectStatus: (s: FaceDetectStatus) => void
  setFaceDetections: (d: FaceDetection[]) => void
  setFocusedFaceIndex: (i: number) => void
  setExportFormat: (f: ExportFormat) => void
  setExportQuality: (q: number) => void
  setExportFilename: (n: string) => void
  setExportBgColor: (c: string) => void
  setBatchFiles: (files: BatchFile[]) => void
  updateBatchFile: (id: string, update: Partial<BatchFile>) => void
  pushHistory: () => void
  undo: () => void
  redo: () => void
}

const initialState = {
  originalFile: null,
  correctedDataUrl: null,
  cropMode: 'free' as CropMode,
  selectedPreset: null,
  aspectRatio: null,
  cropData: null,
  rotation: 0,
  flipH: false,
  flipV: false,
  faceDetectStatus: 'idle' as FaceDetectStatus,
  faceDetections: [],
  focusedFaceIndex: 0,
  history: [],
  historyIndex: -1,
  exportFormat: 'jpg' as ExportFormat,
  exportQuality: 90,
  exportFilename: '',
  exportBgColor: '#ffffff',
  batchFiles: [],
}

export const useCropStore = create<CropStore>((set, get) => ({
  ...initialState,

  setImage: (file, dataUrl) => set({
    originalFile: file,
    correctedDataUrl: dataUrl,
    cropData: null,
    history: [],
    historyIndex: -1,
    rotation: 0,
    flipH: false,
    flipV: false,
    faceDetectStatus: 'idle',
    faceDetections: [],
    focusedFaceIndex: 0,
    exportFilename: file.name.replace(/\.[^.]+$/, '') || 'crop',
  }),

  clearImage: () => set({ ...initialState }),

  setCropMode: (mode) => set({ cropMode: mode }),

  setSelectedPreset: (preset, ratio) => set((state) => ({
    selectedPreset: preset,
    aspectRatio: ratio,
    cropMode:
      preset === null ? state.cropMode :
      preset === 'FreeForm' ? 'free' :
      preset === 'Custom' ? 'custom' : 'ratio',
  })),

  setCropData: (data) => set({ cropData: data }),

  setRotation: (deg) => set({ rotation: deg }),
  setFlipH: (v) => set({ flipH: v }),
  setFlipV: (v) => set({ flipV: v }),

  resetAdjustments: () => set({ rotation: 0, flipH: false, flipV: false }),

  setFaceDetectStatus: (s) => set({ faceDetectStatus: s }),
  setFaceDetections: (d) => set({ faceDetections: d }),
  setFocusedFaceIndex: (i) => set({ focusedFaceIndex: i }),

  setExportFormat: (f) => set({ exportFormat: f }),
  setExportQuality: (q) => set({ exportQuality: q }),
  setExportFilename: (n) => set({ exportFilename: n }),
  setExportBgColor: (c) => set({ exportBgColor: c }),

  setBatchFiles: (files) => set({ batchFiles: files }),
  updateBatchFile: (id, update) => set((s) => ({
    batchFiles: s.batchFiles.map((f) => f.id === id ? { ...f, ...update } : f),
  })),

  pushHistory: () => {
    const s = get()
    const entry: HistoryEntry = {
      cropData: s.cropData,
      cropMode: s.cropMode,
      selectedPreset: s.selectedPreset,
      aspectRatio: s.aspectRatio,
      rotation: s.rotation,
      flipH: s.flipH,
      flipV: s.flipV,
    }
    const newHistory = s.history.slice(0, s.historyIndex + 1)
    newHistory.push(entry)
    if (newHistory.length > MAX_HISTORY_STEPS) newHistory.shift()
    set({ history: newHistory, historyIndex: newHistory.length - 1 })
  },

  undo: () => {
    const { history, historyIndex } = get()
    if (historyIndex <= 0) return
    const prev = history[historyIndex - 1]
    set({ ...prev, historyIndex: historyIndex - 1 })
  },

  redo: () => {
    const { history, historyIndex } = get()
    if (historyIndex >= history.length - 1) return
    const next = history[historyIndex + 1]
    set({ ...next, historyIndex: historyIndex + 1 })
  },
}))
