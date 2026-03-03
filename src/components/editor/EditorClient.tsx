'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Scissors, Minus, Plus, Hand, Undo2, Redo2 } from 'lucide-react'
import { useCropStore } from '@/store/cropStore'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useTheme } from '@/components/ThemeProvider'
import LeftPanel from '@/components/panels/LeftPanel'
import ExportPanel from '@/components/export/ExportPanel'
import { getCroppedBlob, downloadBlob } from '@/lib/exportUtils'
import type { CropperHandle, GuideSettings } from '@/components/cropper/CropperCanvas'

const CropperCanvas = dynamic(
  () => import('@/components/cropper/CropperCanvas'),
  { ssr: false, loading: () => <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Loading canvas…</div> },
)

export default function EditorClient() {
  const router = useRouter()
  const params = useParams()
  const locale = (params?.locale as string) ?? 'en'
  const { theme, toggle } = useTheme()

  const correctedDataUrl = useCropStore((s) => s.correctedDataUrl)
  const originalFile = useCropStore((s) => s.originalFile)
  const rotation = useCropStore((s) => s.rotation)
  const flipH = useCropStore((s) => s.flipH)
  const flipV = useCropStore((s) => s.flipV)
  const aspectRatio = useCropStore((s) => s.aspectRatio)
  const cropMode = useCropStore((s) => s.cropMode)
  const clearImage = useCropStore((s) => s.clearImage)
  const historyIndex = useCropStore((s) => s.historyIndex)
  const historyLength = useCropStore((s) => s.history.length)

  const [zoomMultiplier, setZoomMultiplier] = useState(1)
  const [zoomInputStr, setZoomInputStr] = useState('100')
  const [guides, setGuides] = useState<GuideSettings>({ grid: false, thirds: false, golden: false })
  const [cropDimensions, setCropDimensions] = useState({ w: 0, h: 0 })
  const [dragMode, setDragMode] = useState<'none' | 'move'>('none')
  const [cropVersion, setCropVersion] = useState(0)

  const cropperHandleRef = useRef<CropperHandle | null>(null)
  const spaceBeforeModeRef = useRef<'none' | 'move' | null>(null)

  // Redirect to upload if no image is loaded
  useEffect(() => {
    if (!correctedDataUrl) router.replace(`/${locale}/`)
  }, [correctedDataUrl, router, locale])

  // Keep zoom input in sync with external changes (slider, +/- buttons, reset)
  useEffect(() => {
    setZoomInputStr(String(Math.round(zoomMultiplier * 100)))
  }, [zoomMultiplier])

  // Refresh preview when crop-affecting state changes that don't fire cropend
  // (mode switch, preset select, rotation, flip). CropperCanvas effects run
  // before EditorClient effects, so cropperjs is already updated by this point.
  useEffect(() => {
    setCropVersion((v) => v + 1)
  }, [aspectRatio, rotation, flipH, flipV])

  // Space → temporary pan mode (desktop); release → restore previous mode
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === ' ' && spaceBeforeModeRef.current === null) {
        e.preventDefault()
        spaceBeforeModeRef.current = dragMode
        setDragMode('move')
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ' && spaceBeforeModeRef.current !== null) {
        setDragMode(spaceBeforeModeRef.current)
        spaceBeforeModeRef.current = null
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [dragMode])

  // ─── History helpers ───────────────────────────────────────────────────────

  /**
   * Capture current state (including live crop box position) and push to stack.
   * Must be called BEFORE the action that changes state.
   */
  const handleHistoryPush = useCallback(() => {
    const currentCropData = cropperHandleRef.current?.getCropData() ?? null
    const store = useCropStore.getState()
    store.setCropData(currentCropData)
    store.pushHistory()
  }, [])

  const handleUndo = useCallback(() => {
    const { history, historyIndex: idx } = useCropStore.getState()
    if (idx <= 0) return
    const prevEntry = history[idx - 1]
    useCropStore.getState().undo()
    cropperHandleRef.current?.queueCropRestore(prevEntry.cropData)
    setCropVersion((v) => v + 1)
  }, [])

  const handleRedo = useCallback(() => {
    const { history, historyIndex: idx } = useCropStore.getState()
    if (idx >= history.length - 1) return
    const nextEntry = history[idx + 1]
    useCropStore.getState().redo()
    cropperHandleRef.current?.queueCropRestore(nextEntry.cropData)
    setCropVersion((v) => v + 1)
  }, [])

  // cropstart → push history BEFORE the crop box moves
  const handleCropStart = useCallback(() => {
    handleHistoryPush()
  }, [handleHistoryPush])

  // cropend → bump version to refresh preview
  const handleCropEnd = useCallback(() => {
    setCropVersion((v) => v + 1)
  }, [])

  // ─── Keyboard shortcuts ────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      // Ctrl+Z / Ctrl+Shift+Z
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
        return
      }
      if (e.ctrlKey && e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        handleRedo()
        return
      }
      if (e.ctrlKey && e.key === 'y') {
        e.preventDefault()
        handleRedo()
        return
      }

      // Ctrl+S → download
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault()
        const canvas = cropperHandleRef.current?.getCroppedCanvas()
        if (!canvas) return
        const { exportFormat: fmt, exportQuality: q, exportFilename: fn, exportBgColor: bg } = useCropStore.getState()
        getCroppedBlob(canvas, fmt, q, bg).then((blob) => downloadBlob(blob, fn, fmt))
        return
      }

      // Delete → re-upload
      if (e.key === 'Delete') {
        clearImage()
        router.push(`/${locale}/`)
        return
      }

      // Arrow key nudge
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return
      const c = cropperHandleRef.current?.getCropper()
      if (!c) return
      e.preventDefault()
      const step = e.shiftKey ? 10 : 1
      const d = c.getData()
      switch (e.key) {
        case 'ArrowUp':    c.setData({ ...d, y: d.y - step }); break
        case 'ArrowDown':  c.setData({ ...d, y: d.y + step }); break
        case 'ArrowLeft':  c.setData({ ...d, x: d.x - step }); break
        case 'ArrowRight': c.setData({ ...d, x: d.x + step }); break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [clearImage, router, locale, handleUndo, handleRedo])

  // ─── Zoom helpers ──────────────────────────────────────────────────────────

  const handleReupload = () => {
    clearImage()
    router.push(`/${locale}/`)
  }

  const toggleGuide = (key: keyof GuideSettings) =>
    setGuides((prev) => ({ ...prev, [key]: !prev[key] }))

  const handleZoomIn = () => {
    const c = cropperHandleRef.current?.getCropper()
    c?.zoom(0.1)
  }
  const handleZoomOut = () => {
    const c = cropperHandleRef.current?.getCropper()
    c?.zoom(-0.1)
  }
  const handleZoomReset = () => {
    setZoomMultiplier(1)
    cropperHandleRef.current?.setZoom(1)
  }
  const handleZoomInputChange = (val: string) => {
    setZoomInputStr(val)
    const n = parseInt(val)
    if (!isNaN(n) && n >= 10 && n <= 500) {
      const m = n / 100
      setZoomMultiplier(m)
      cropperHandleRef.current?.setZoom(m)
    }
  }
  const handleZoomInputBlur = () => {
    const n = parseInt(zoomInputStr)
    if (isNaN(n) || n < 10 || n > 500) {
      setZoomInputStr(String(Math.round(zoomMultiplier * 100)))
    }
  }
  const handleCustomSize = (w: number, h: number) => {
    const c = cropperHandleRef.current?.getCropper()
    if (!c) return
    c.setAspectRatio(w / h)
    c.setData({ ...c.getData(), width: w, height: h })
  }

  // Pan active → move; Free (no pan) → crop (allow re-draw); Preset/Custom (no pan) → none
  const effectiveDragMode: 'crop' | 'move' | 'none' =
    dragMode === 'move' ? 'move' : cropMode === 'free' ? 'crop' : 'none'

  const isTransparent =
    originalFile?.type === 'image/png' || originalFile?.type === 'image/webp'

  const canUndo = historyIndex > 0
  const canRedo = historyIndex < historyLength - 1

  if (!correctedDataUrl) return null

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">

      {/* ─── Navbar ─── */}
      <header className="border-b px-4 h-12 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 font-semibold">
          <Scissors className="w-4 h-4" />
          ImageCrop
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Button variant="ghost" size="icon" onClick={toggle} className="h-8 w-8" aria-label="Toggle theme">
            {theme === 'dark' ? '☀' : '☾'}
          </Button>
          <Button variant="ghost" size="sm" className="text-xs h-8">Help</Button>
        </div>
      </header>

      {/* ─── Main (three-column) ─── */}
      <div className="flex-1 flex min-h-0">

        {/* Left panel */}
        <LeftPanel
          onReupload={handleReupload}
          onCustomSize={handleCustomSize}
          onHistoryPush={handleHistoryPush}
        />

        {/* Canvas area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Crop canvas */}
          <div className="flex-1 relative overflow-hidden bg-muted/40">
            <CropperCanvas
              src={correctedDataUrl}
              aspectRatio={aspectRatio}
              rotation={rotation}
              flipH={flipH}
              flipV={flipV}
              guides={guides}
              showCheckerboard={!!isTransparent}
              dragMode={effectiveDragMode}
              onCropData={(w, h) => setCropDimensions({ w, h })}
              onZoomChange={setZoomMultiplier}
              onReady={(handle) => { cropperHandleRef.current = handle }}
              onCropStart={handleCropStart}
              onCropEnd={handleCropEnd}
            />
          </div>

          {/* Zoom + guides bar */}
          <div className="h-11 border-t px-3 flex items-center gap-3 shrink-0 bg-background">
            <span className="text-xs text-muted-foreground shrink-0">Zoom</span>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={handleZoomOut}>
              <Minus className="w-3 h-3" />
            </Button>
            <Slider
              className="w-28 shrink-0"
              min={10} max={500} step={1}
              value={[Math.round(zoomMultiplier * 100)]}
              onValueChange={([v]) => {
                const m = v / 100
                setZoomMultiplier(m)
                cropperHandleRef.current?.setZoom(m)
              }}
            />
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={handleZoomIn}>
              <Plus className="w-3 h-3" />
            </Button>
            <input
              type="number"
              min={10} max={500} step={1}
              value={zoomInputStr}
              onChange={(e) => handleZoomInputChange(e.target.value)}
              onBlur={handleZoomInputBlur}
              className="w-14 h-6 text-xs text-center border rounded bg-background text-foreground shrink-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              aria-label="Zoom percentage"
            />
            <span className="text-xs text-muted-foreground shrink-0">%</span>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs shrink-0" onClick={handleZoomReset}>
              Reset
            </Button>

            <Button
              variant={dragMode === 'move' ? 'default' : 'ghost'}
              size="sm"
              className="h-6 px-2 text-xs shrink-0 gap-1"
              onClick={() => setDragMode(dragMode === 'move' ? 'none' : 'move')}
              title="Pan mode — hold Space to activate temporarily"
            >
              <Hand className="w-3 h-3" />
              Pan
            </Button>

            <div className="h-4 border-l mx-1" />

            {(['grid', 'thirds', 'golden'] as const).map((g) => (
              <button
                key={g}
                onClick={() => toggleGuide(g)}
                className={`px-2 py-0.5 text-xs rounded border transition-colors capitalize ${
                  guides[g]
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:border-primary/60'
                }`}
              >
                {g}
              </button>
            ))}

            {cropDimensions.w > 0 && (
              <>
                <div className="h-4 border-l mx-1" />
                <span className="text-xs text-muted-foreground">
                  {cropDimensions.w} × {cropDimensions.h} px
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right panel — Export */}
        <ExportPanel
          cropperHandleRef={cropperHandleRef}
          cropVersion={cropVersion}
        />
      </div>

      {/* ─── Status bar ─── */}
      <footer className="border-t h-9 px-4 flex items-center justify-between shrink-0 bg-background text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost" size="icon" className="h-6 w-6"
            onClick={handleUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost" size="icon" className="h-6 w-6"
            onClick={handleRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </Button>
          {historyLength > 0 && (
            <span className="ml-1 opacity-60">
              {historyIndex + 1} / {historyLength}
            </span>
          )}
        </div>
        <span className="opacity-50 text-[10px]">Ctrl+Z undo · Ctrl+Shift+Z redo · Ctrl+S download</span>
      </footer>
    </div>
  )
}
