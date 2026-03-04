'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Scissors, Minus, Plus, Hand, Undo2, Redo2, Download } from 'lucide-react'
import { useCropStore } from '@/store/cropStore'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useTheme } from '@/components/ThemeProvider'
import LeftPanel from '@/components/panels/LeftPanel'
import ExportPanel from '@/components/export/ExportPanel'
import { getCroppedBlob, downloadBlob } from '@/lib/exportUtils'
import type { CropperHandle, GuideSettings } from '@/components/cropper/CropperCanvas'
import type { FaceDetection } from '@/types'
import OnboardingGuide from '@/components/guide/OnboardingGuide'

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
  const [mobileTab, setMobileTab] = useState<'crop' | 'adjust' | 'ai' | 'export'>('crop')
  const [guideForceOpen, setGuideForceOpen] = useState(false)

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

  // ─── AI face detection ────────────────────────────────────────────────────

  // Terminate the worker when the editor unmounts
  useEffect(() => {
    return () => {
      import('@/lib/faceDetectClient').then(({ terminateDetectWorker }) => terminateDetectWorker())
    }
  }, [])

  const handleDetectFaces = useCallback(async () => {
    const store = useCropStore.getState()
    const { correctedDataUrl: url } = store
    if (!url) return
    store.setFaceDetectStatus('loading')
    try {
      const { detectFaces } = await import('@/lib/faceDetectClient')
      const faces = await detectFaces(url, (phase) => {
        store.setFaceDetectStatus(phase)
      })
      store.setFaceDetections(faces)
      store.setFocusedFaceIndex(0)
      store.setFaceDetectStatus('done')
    } catch (err) {
      console.error('[FaceDetect]', err)
      store.setFaceDetectStatus('error')
    }
  }, [])

  /**
   * Apply a face bounding box (+ headroom padding) to the cropperjs crop box.
   * Coordinates are in the corrected image's natural-pixel space.
   */
  const handleApplyFace = useCallback((faceIndex: number | 'all') => {
    const { faceDetections } = useCropStore.getState()
    const cropper = cropperHandleRef.current?.getCropper()
    if (!cropper || faceDetections.length === 0) return

    const imgData = cropper.getImageData()
    const imgW = imgData.naturalWidth
    const imgH = imgData.naturalHeight

    let box: FaceDetection
    if (faceIndex === 'all') {
      const minX = Math.min(...faceDetections.map((f) => f.x))
      const minY = Math.min(...faceDetections.map((f) => f.y))
      const maxX = Math.max(...faceDetections.map((f) => f.x + f.width))
      const maxY = Math.max(...faceDetections.map((f) => f.y + f.height))
      box = { x: minX, y: minY, width: maxX - minX, height: maxY - minY, confidence: 1 }
    } else {
      box = faceDetections[faceIndex]
    }

    // Add headroom: generous top padding for hair, moderate on sides/bottom
    const padX      = box.width  * 0.25
    const padTop    = box.height * 0.45
    const padBottom = box.height * 0.15

    const x = Math.max(0, Math.round(box.x - padX))
    const y = Math.max(0, Math.round(box.y - padTop))
    const w = Math.min(imgW - x, Math.round(box.width  + padX * 2))
    const h = Math.min(imgH - y, Math.round(box.height + padTop + padBottom))

    // Push history, then switch to free mode (no aspect-ratio lock), then apply
    handleHistoryPush()
    useCropStore.getState().setCropMode('free')
    useCropStore.getState().setSelectedPreset(null, null)

    // queueCropRestore pattern: fires after CropperCanvas effects settle
    setTimeout(() => {
      cropper.setData({ x, y, width: w, height: h })
      setCropVersion((v) => v + 1)
    }, 0)
  }, [handleHistoryPush])

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
  const handleMobileDownload = useCallback(() => {
    const canvas = cropperHandleRef.current?.getCroppedCanvas()
    if (!canvas) return
    const { exportFormat: fmt, exportQuality: q, exportFilename: fn, exportBgColor: bg } = useCropStore.getState()
    getCroppedBlob(canvas, fmt, q, bg).then((blob) => downloadBlob(blob, fn, fmt))
  }, [])

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
      <OnboardingGuide
        startStep={1} endStep={3} storageKey="imagecrop-guide-editor"
        forceOpen={guideForceOpen}
        onDismiss={() => setGuideForceOpen(false)}
      />

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
          <Button
            variant="ghost" size="sm" className="text-xs h-8"
            onClick={() => {
              localStorage.removeItem('imagecrop-guide-editor')
              setGuideForceOpen(true)
            }}
            title="Restart the editor guide"
          >
            Help
          </Button>
        </div>
      </header>

      {/* ─── Desktop: three-column (hidden on mobile) ─── */}
      <div className="hidden md:flex flex-1 min-h-0">

        {/* Left panel */}
        <LeftPanel
          onReupload={handleReupload}
          onCustomSize={handleCustomSize}
          onHistoryPush={handleHistoryPush}
          onDetectFaces={handleDetectFaces}
          onApplyFace={handleApplyFace}
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

      {/* ─── Mobile layout (hidden on desktop) ─── */}
      <div className="flex md:hidden flex-1 flex-col min-h-0">
        {/* Canvas area */}
        <div className="h-[50vh] relative overflow-hidden bg-muted/40 shrink-0">
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

        {/* 4-tab navigation bar */}
        <div className="flex border-b shrink-0 bg-background">
          {(['crop', 'adjust', 'ai', 'export'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setMobileTab(tab)}
              className={`flex-1 py-2 text-xs font-medium capitalize transition-colors ${
                mobileTab === tab
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'crop' ? 'Crop' : tab === 'adjust' ? 'Adjust' : tab === 'ai' ? 'AI' : 'Export'}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {mobileTab === 'crop' && (
            <LeftPanel
              mobileSection="crop"
              onReupload={handleReupload}
              onCustomSize={handleCustomSize}
              onHistoryPush={handleHistoryPush}
              onDetectFaces={handleDetectFaces}
              onApplyFace={handleApplyFace}
            />
          )}
          {mobileTab === 'adjust' && (
            <LeftPanel
              mobileSection="adjust"
              onReupload={handleReupload}
              onCustomSize={handleCustomSize}
              onHistoryPush={handleHistoryPush}
              onDetectFaces={handleDetectFaces}
              onApplyFace={handleApplyFace}
            />
          )}
          {mobileTab === 'ai' && (
            <LeftPanel
              mobileSection="ai"
              onReupload={handleReupload}
              onCustomSize={handleCustomSize}
              onHistoryPush={handleHistoryPush}
              onDetectFaces={handleDetectFaces}
              onApplyFace={handleApplyFace}
            />
          )}
          {mobileTab === 'export' && (
            <ExportPanel
              cropperHandleRef={cropperHandleRef}
              cropVersion={cropVersion}
            />
          )}
        </div>

        {/* Bottom action bar */}
        <div className="h-12 border-t flex items-center justify-around shrink-0 bg-background px-4">
          <Button
            variant="ghost" size="sm" className="flex-1 gap-1 text-xs"
            onClick={handleUndo} disabled={!canUndo}
          >
            <Undo2 className="w-4 h-4" />
            Undo
          </Button>
          <Button
            variant="default" size="sm" className="flex-1 gap-1 text-xs mx-2"
            onClick={handleMobileDownload}
          >
            <Download className="w-4 h-4" />
            Save
          </Button>
          <Button
            variant="ghost" size="sm" className="flex-1 gap-1 text-xs"
            onClick={handleRedo} disabled={!canRedo}
          >
            <Redo2 className="w-4 h-4" />
            Redo
          </Button>
        </div>
      </div>

      {/* ─── Status bar (desktop only) ─── */}
      <footer className="hidden md:flex border-t h-9 px-4 items-center justify-between shrink-0 bg-background text-xs text-muted-foreground">
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
