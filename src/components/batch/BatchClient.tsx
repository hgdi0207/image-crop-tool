'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Scissors, Plus, Download, RefreshCw, Pencil } from 'lucide-react'
import { useCropStore } from '@/store/cropStore'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useTheme } from '@/components/ThemeProvider'
import { batchCropFile, downloadAsZip } from '@/lib/batchUtils'
import { formatFileSize } from '@/lib/exportUtils'
import type { ExportFormat, BatchFile } from '@/types'

// Ratio presets for batch settings
const RATIO_OPTIONS: { label: string; value: number | null }[] = [
  { label: 'Free',  value: null },
  { label: '1:1',   value: 1 },
  { label: '4:3',   value: 4 / 3 },
  { label: '16:9',  value: 16 / 9 },
  { label: '9:16',  value: 9 / 16 },
]

export default function BatchClient() {
  const router = useRouter()
  const params = useParams()
  const locale = (params?.locale as string) ?? 'en'
  const { theme, toggle } = useTheme()

  const batchFiles = useCropStore((s) => s.batchFiles)
  const setBatchFiles = useCropStore((s) => s.setBatchFiles)
  const updateBatchFile = useCropStore((s) => s.updateBatchFile)
  const setImage = useCropStore((s) => s.setImage)

  // Batch settings state
  const [ratio, setRatio] = useState<number | null>(null)
  const [customW, setCustomW] = useState('')
  const [customH, setCustomH] = useState('')
  const [useCustom, setUseCustom] = useState(false)
  const [format, setFormat] = useState<ExportFormat>('jpg')
  const [quality, setQuality] = useState(90)
  const [processing, setProcessing] = useState(false)

  const addInputRef = useRef<HTMLInputElement>(null)

  // Redirect to home if no batch files
  useEffect(() => {
    if (batchFiles.length === 0) {
      router.replace(`/${locale}/`)
    }
  }, [batchFiles.length, router, locale])

  // Derive effective ratio (custom overrides preset)
  const effectiveRatio: number | null = (() => {
    if (useCustom) {
      const w = parseFloat(customW)
      const h = parseFloat(customH)
      return w > 0 && h > 0 ? w / h : null
    }
    return ratio
  })()

  const doneCount = batchFiles.filter((f) => f.status === 'done').length
  const failedCount = batchFiles.filter((f) => f.status === 'failed').length

  async function handleProcessAll() {
    setProcessing(true)
    // Reset all to waiting
    setBatchFiles(batchFiles.map((f) => ({ ...f, status: 'waiting', resultUrl: undefined, error: undefined })))

    for (const file of batchFiles) {
      updateBatchFile(file.id, { status: 'processing' })
      try {
        const result = await batchCropFile(file.file, effectiveRatio, format, quality)
        const url = URL.createObjectURL(result.blob)
        updateBatchFile(file.id, {
          status: 'done',
          resultUrl: url,
          outputWidth: result.width,
          outputHeight: result.height,
        })
      } catch {
        updateBatchFile(file.id, { status: 'failed', error: 'Processing failed' })
      }
    }
    setProcessing(false)
  }

  async function handleRetry(file: BatchFile) {
    updateBatchFile(file.id, { status: 'processing', error: undefined })
    try {
      const result = await batchCropFile(file.file, effectiveRatio, format, quality)
      const url = URL.createObjectURL(result.blob)
      updateBatchFile(file.id, {
        status: 'done',
        resultUrl: url,
        outputWidth: result.width,
        outputHeight: result.height,
      })
    } catch {
      updateBatchFile(file.id, { status: 'failed', error: 'Processing failed' })
    }
  }

  async function handleDownloadZip() {
    const done = batchFiles.filter((f) => f.status === 'done' && f.resultUrl)
    const items = await Promise.all(
      done.map(async (f) => {
        const res = await fetch(f.resultUrl!)
        const blob = await res.blob()
        const ext = format === 'jpg' ? 'jpg' : format === 'png' ? 'png' : 'webp'
        const base = f.file.name.replace(/\.[^.]+$/, '')
        return { filename: `${base}.${ext}`, blob }
      })
    )
    await downloadAsZip(items, 'batch-crop')
  }

  function handleAddMore(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    const newEntries: BatchFile[] = files.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      status: 'waiting',
    }))
    setBatchFiles([...batchFiles, ...newEntries])
    e.target.value = ''
  }

  function handleEditSingle(file: BatchFile) {
    // Load into single-image editor
    const url = URL.createObjectURL(file.file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      setImage(file.file, img.src)
      router.push(`/${locale}/editor`)
    }
    img.src = url
  }

  const statusBadge = (f: BatchFile) => {
    if (f.status === 'done')
      return <span className="text-xs text-green-600 font-medium">Done {f.outputWidth}×{f.outputHeight}</span>
    if (f.status === 'processing')
      return <span className="text-xs text-blue-500 font-medium animate-pulse">Processing…</span>
    if (f.status === 'failed')
      return <span className="text-xs text-destructive font-medium">Failed</span>
    return <span className="text-xs text-muted-foreground">Waiting</span>
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Navbar */}
      <header className="border-b px-6 h-14 flex items-center justify-between shrink-0">
        <div
          className="flex items-center gap-2 font-semibold text-lg cursor-pointer"
          onClick={() => router.push(`/${locale}/`)}
        >
          <Scissors className="w-5 h-5" />
          ImageCrop
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
            {theme === 'dark' ? '☀' : '☾'}
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col gap-6 p-6 max-w-6xl mx-auto w-full">
        {/* Batch Settings */}
        <section className="border rounded-xl p-4 flex flex-wrap gap-4 items-end">
          <h2 className="w-full text-base font-semibold mb-1">Batch Settings</h2>

          {/* Ratio */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground font-medium">Ratio</label>
            <div className="flex gap-1 flex-wrap">
              {RATIO_OPTIONS.map((opt) => (
                <Button
                  key={opt.label}
                  variant={!useCustom && ratio === opt.value ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs px-3"
                  onClick={() => { setRatio(opt.value); setUseCustom(false) }}
                >
                  {opt.label}
                </Button>
              ))}
              <Button
                variant={useCustom ? 'default' : 'outline'}
                size="sm"
                className="text-xs px-3"
                onClick={() => setUseCustom(true)}
              >
                Custom
              </Button>
            </div>
            {useCustom && (
              <div className="flex items-center gap-1 mt-1">
                <Input
                  className="w-16 h-7 text-xs text-center"
                  placeholder="W"
                  value={customW}
                  onChange={(e) => setCustomW(e.target.value)}
                />
                <span className="text-muted-foreground text-xs">×</span>
                <Input
                  className="w-16 h-7 text-xs text-center"
                  placeholder="H"
                  value={customH}
                  onChange={(e) => setCustomH(e.target.value)}
                />
                <span className="text-xs text-muted-foreground">px</span>
              </div>
            )}
          </div>

          {/* Format */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground font-medium">Format</label>
            <div className="flex gap-1">
              {(['jpg', 'png', 'webp'] as ExportFormat[]).map((f) => (
                <Button
                  key={f}
                  variant={format === f ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs px-3 uppercase"
                  onClick={() => setFormat(f)}
                >
                  {f}
                </Button>
              ))}
            </div>
          </div>

          {/* Quality */}
          {format !== 'png' && (
            <div className="flex flex-col gap-1.5 min-w-[160px]">
              <label className="text-xs text-muted-foreground font-medium">
                Quality&nbsp;{quality}%
              </label>
              <Slider
                min={10} max={100} step={1}
                value={[quality]}
                onValueChange={([v]) => setQuality(v)}
                className="w-40"
              />
            </div>
          )}
        </section>

        {/* Images header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">
            Images ({batchFiles.length})
            {doneCount > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {doneCount} done{failedCount > 0 && `, ${failedCount} failed`}
              </span>
            )}
          </h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => addInputRef.current?.click()}>
              <Plus className="w-4 h-4 mr-1" /> Add More
            </Button>
            <input
              ref={addInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleAddMore}
            />
            <Button
              onClick={handleProcessAll}
              disabled={processing || batchFiles.length === 0}
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${processing ? 'animate-spin' : ''}`} />
              {processing ? 'Processing…' : 'Process All'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={doneCount === 0}
              onClick={handleDownloadZip}
            >
              <Download className="w-4 h-4 mr-1" />
              Download ZIP ({doneCount} ready)
            </Button>
          </div>
        </div>

        {/* Overall progress bar */}
        {batchFiles.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300 rounded-full"
                style={{ width: `${(doneCount / batchFiles.length) * 100}%` }}
              />
            </div>
            <span className="text-sm text-muted-foreground shrink-0">
              {doneCount} / {batchFiles.length}
            </span>
          </div>
        )}

        {/* Image grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {batchFiles.map((file) => (
            <div
              key={file.id}
              className="border rounded-xl overflow-hidden flex flex-col"
            >
              {/* Thumbnail */}
              <div className="aspect-square bg-muted relative">
                <img
                  src={URL.createObjectURL(file.file)}
                  alt={file.file.name}
                  className="w-full h-full object-cover"
                />
                {file.status === 'processing' && (
                  <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                  </div>
                )}
                {file.status === 'done' && (
                  <div className="absolute top-1 right-1 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    ✓
                  </div>
                )}
                {file.status === 'failed' && (
                  <div className="absolute top-1 right-1 bg-destructive text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    ✕
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-2 flex flex-col gap-1.5">
                <p className="text-xs truncate text-muted-foreground" title={file.file.name}>
                  {file.file.name}
                </p>
                <p className="text-xs text-muted-foreground">{formatFileSize(file.file.size)}</p>
                {statusBadge(file)}

                <div className="flex gap-1 mt-1">
                  {file.status === 'failed' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-6 px-2 flex-1"
                      onClick={() => handleRetry(file)}
                    >
                      Retry
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-6 px-2 flex-1"
                    onClick={() => handleEditSingle(file)}
                  >
                    <Pencil className="w-3 h-3 mr-1" /> Edit
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
