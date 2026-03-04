'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { useCropStore } from '@/store/cropStore'
import { getCroppedBlob, downloadBlob, formatFileSize } from '@/lib/exportUtils'
import type { CropperHandle } from '@/components/cropper/CropperCanvas'
import type { ExportFormat } from '@/types'

interface Props {
  cropperHandleRef: React.RefObject<CropperHandle | null>
  cropVersion: number
}

const FORMATS: { key: ExportFormat; label: string }[] = [
  { key: 'jpg', label: 'JPG' },
  { key: 'png', label: 'PNG' },
  { key: 'webp', label: 'WEBP' },
]

export default function ExportPanel({ cropperHandleRef, cropVersion }: Props) {
  const t = useTranslations('editor.export')
  const exportFormat   = useCropStore((s) => s.exportFormat)
  const exportQuality  = useCropStore((s) => s.exportQuality)
  const exportFilename = useCropStore((s) => s.exportFilename)
  const exportBgColor  = useCropStore((s) => s.exportBgColor)
  const setExportFormat   = useCropStore((s) => s.setExportFormat)
  const setExportQuality  = useCropStore((s) => s.setExportQuality)
  const setExportFilename = useCropStore((s) => s.setExportFilename)
  const setExportBgColor  = useCropStore((s) => s.setExportBgColor)

  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const [previewSize, setPreviewSize] = useState<{ w: number; h: number } | null>(null)
  const [estimatedSize, setEstimatedSize] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const sizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Render preview thumbnail whenever crop changes
  useEffect(() => {
    const canvas = cropperHandleRef.current?.getCroppedCanvas({ maxWidth: 240, maxHeight: 180 })
    if (!canvas || !previewCanvasRef.current) return
    const ctx = previewCanvasRef.current.getContext('2d')
    if (!ctx) return
    previewCanvasRef.current.width = canvas.width
    previewCanvasRef.current.height = canvas.height
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(canvas, 0, 0)
    // Show actual crop pixel dimensions (from natural image), not thumbnail canvas size
    const cropData = cropperHandleRef.current?.getCropData()
    setPreviewSize(
      cropData
        ? { w: cropData.width, h: cropData.height }
        : { w: canvas.width, h: canvas.height }
    )
  }, [cropVersion, cropperHandleRef])

  // Estimate export file size (debounced)
  const scheduleEstimate = useCallback(() => {
    if (sizeTimerRef.current) clearTimeout(sizeTimerRef.current)
    sizeTimerRef.current = setTimeout(async () => {
      const canvas = cropperHandleRef.current?.getCroppedCanvas()
      if (!canvas) { setEstimatedSize(null); return }
      try {
        const blob = await getCroppedBlob(canvas, exportFormat, exportQuality, exportBgColor)
        setEstimatedSize(formatFileSize(blob.size))
      } catch {
        setEstimatedSize(null)
      }
    }, 400)
  }, [cropperHandleRef, exportFormat, exportQuality, exportBgColor])

  useEffect(() => {
    scheduleEstimate()
    return () => { if (sizeTimerRef.current) clearTimeout(sizeTimerRef.current) }
  }, [scheduleEstimate, cropVersion])

  const handleDownload = async () => {
    const canvas = cropperHandleRef.current?.getCroppedCanvas()
    if (!canvas) return
    setDownloading(true)
    try {
      const blob = await getCroppedBlob(canvas, exportFormat, exportQuality, exportBgColor)
      downloadBlob(blob, exportFilename, exportFormat)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <aside className="w-64 shrink-0 border-l flex flex-col bg-background overflow-y-auto">
      <div className="p-3 border-b">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          {t('title')}
        </p>

        {/* Preview thumbnail */}
        <div className="relative rounded overflow-hidden bg-[repeating-conic-gradient(#e0e0e0_0%_25%,#fff_0%_50%)_0_0/12px_12px] flex items-center justify-center mb-2 h-[140px]">
          <canvas
            ref={previewCanvasRef}
            className="max-w-full max-h-full object-contain"
            style={{ imageRendering: 'auto' }}
          />
        </div>

        {previewSize && (
          <p className="text-[10px] text-muted-foreground text-center mb-3">
            {previewSize.w} × {previewSize.h} px
          </p>
        )}
      </div>

      {/* Export settings */}
      <div className="p-3 space-y-4 flex-1">

        {/* Format */}
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">{t('format')}</p>
          <div className="flex gap-1">
            {FORMATS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setExportFormat(key)}
                className={`flex-1 py-1 text-xs rounded border transition-colors ${
                  exportFormat === key
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border hover:border-primary/60 text-muted-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Quality */}
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>{t('quality')}</span>
            <span className={exportFormat === 'png' ? 'opacity-40' : ''}>{exportQuality}%</span>
          </div>
          <Slider
            min={1} max={100} step={1}
            value={[exportQuality]}
            disabled={exportFormat === 'png'}
            onValueChange={([v]) => setExportQuality(v)}
            className={exportFormat === 'png' ? 'opacity-40' : ''}
          />
          {exportFormat === 'png' && (
            <p className="text-[10px] text-muted-foreground mt-1">{t('lossless')}</p>
          )}
        </div>

        {/* Filename */}
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">{t('filename')}</p>
          <Input
            value={exportFilename}
            onChange={(e) => setExportFilename(e.target.value)}
            className="h-7 text-xs"
            placeholder="crop"
          />
        </div>

        {/* BG Color (JPG only) */}
        {exportFormat === 'jpg' && (
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">{t('bgColor')}</p>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={exportBgColor}
                onChange={(e) => setExportBgColor(e.target.value)}
                className="w-8 h-7 rounded border border-border cursor-pointer bg-transparent p-0.5"
                title="Background color for JPG export"
              />
              <span className="text-xs text-muted-foreground font-mono">{exportBgColor}</span>
            </div>
          </div>
        )}

        {/* Estimated size */}
        {estimatedSize && (
          <p className="text-xs text-muted-foreground">
            {t('estSize')}: <span className="text-foreground font-medium">{estimatedSize}</span>
          </p>
        )}
      </div>

      {/* Download button */}
      <div className="p-3 border-t">
        <Button
          className="w-full gap-1.5"
          onClick={handleDownload}
          disabled={downloading}
        >
          {downloading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('exporting')}</>
            : <><Download className="w-4 h-4" /> {t('download')}</>
          }
        </Button>
      </div>
    </aside>
  )
}
