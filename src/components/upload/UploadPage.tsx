'use client'

import { useCallback, useEffect, useRef, useState, DragEvent } from 'react'
import { useTranslations } from 'next-intl'
import { useImageUpload } from '@/hooks/useImageUpload'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Scissors, CloudUpload, Link } from 'lucide-react'
import { useTheme } from '@/components/ThemeProvider'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import OnboardingGuide from '@/components/guide/OnboardingGuide'

export default function UploadPage() {
  const t = useTranslations('upload')
  const nav = useTranslations('nav')
  const { processFile, processUrl, processBatchFiles } = useImageUpload()
  const { theme, toggle } = useTheme()

  const [isDragging, setIsDragging] = useState(false)
  const [guideForceOpen, setGuideForceOpen] = useState(false)
  const [urlValue, setUrlValue] = useState('')
  const [downsampleDialog, setDownsampleDialog] = useState<{
    open: boolean; width: number; height: number; resolve?: (v: boolean) => void
  }>({ open: false, width: 0, height: 0 })

  const fileInputRef = useRef<HTMLInputElement>(null)

  const requestDownsampleConfirm = useCallback((w: number, h: number) => {
    return new Promise<boolean>((resolve) => {
      setDownsampleDialog({ open: true, width: w, height: h, resolve })
    })
  }, [])

  // Ctrl+V paste
  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) processFile(file, requestDownsampleConfirm)
          break
        }
      }
    }
    window.addEventListener('paste', handler)
    return () => window.removeEventListener('paste', handler)
  }, [processFile, requestDownsampleConfirm])

  const onDragOver = (e: DragEvent) => { e.preventDefault(); setIsDragging(true) }
  const onDragLeave = () => setIsDragging(false)
  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 1) processBatchFiles(files)
    else if (files.length === 1) processFile(files[0], requestDownsampleConfirm)
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 1) processBatchFiles(files)
    else if (files.length === 1) processFile(files[0], requestDownsampleConfirm)
    e.target.value = ''
  }

  const onUrlImport = () => {
    if (urlValue.trim()) processUrl(urlValue.trim(), requestDownsampleConfirm)
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <OnboardingGuide
        startStep={0} endStep={0} storageKey="imagecrop-guide-upload"
        forceOpen={guideForceOpen}
        onDismiss={() => setGuideForceOpen(false)}
      />
      {/* Navbar */}
      <header className="border-b px-6 h-14 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 font-semibold text-lg">
          <Scissors className="w-5 h-5" />
          ImageCrop
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
            {theme === 'dark' ? '☀' : '☾'}
          </Button>
          <Button
            variant="ghost" size="sm"
            onClick={() => {
              localStorage.removeItem('imagecrop-guide-upload')
              setGuideForceOpen(true)
            }}
            title="Restart the guide"
          >
            {nav('help')}
          </Button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-xl flex flex-col gap-4">
          {/* Drop zone */}
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative border-2 border-dashed rounded-2xl p-12
              flex flex-col items-center gap-4 cursor-pointer
              transition-colors duration-150 select-none
              ${isDragging
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/60 hover:bg-muted/40'
              }
            `}
          >
            <CloudUpload className="w-12 h-12 text-muted-foreground" />
            <p className="text-xl font-medium">
              {isDragging ? t('dragActive') : t('title')}
            </p>
            <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
            <p className="text-xs text-muted-foreground">{t('maxSize')}</p>
            <Button variant="default" className="mt-2 pointer-events-none">
              {t('chooseFile')}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={onFileChange}
            />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 text-muted-foreground text-sm">
            <div className="flex-1 h-px bg-border" />
            {t('or')}
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Paste hint */}
          <p className="text-center text-sm text-muted-foreground">{t('pasteHint')}</p>

          {/* URL import */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder={t('urlPlaceholder')}
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onUrlImport()}
              />
            </div>
            <Button variant="outline" onClick={onUrlImport}>{t('urlImport')}</Button>
          </div>

          {/* Batch link — opens multi-select file picker */}
          <p
            className="text-center text-sm text-primary underline-offset-4 hover:underline cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            {t('batchLink')}
          </p>
        </div>
      </main>

      {/* Downsample dialog */}
      <Dialog
        open={downsampleDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            downsampleDialog.resolve?.(false)
            setDownsampleDialog((d) => ({ ...d, open: false }))
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('errors.downsamplePromptTitle')}</DialogTitle>
            <DialogDescription>
              {t('errors.downsamplePromptDesc', {
                width: downsampleDialog.width,
                height: downsampleDialog.height,
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => {
              downsampleDialog.resolve?.(false)
              setDownsampleDialog((d) => ({ ...d, open: false }))
            }}>
              {t('errors.downsampleSkip')}
            </Button>
            <Button onClick={() => {
              downsampleDialog.resolve?.(true)
              setDownsampleDialog((d) => ({ ...d, open: false }))
            }}>
              {t('errors.downsampleConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
