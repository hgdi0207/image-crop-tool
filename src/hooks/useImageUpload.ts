'use client'

import { useCallback } from 'react'
import { toast } from 'sonner'
import { useCropStore } from '@/store/cropStore'
import { correctExifOrientation, downsampleDataUrl, getImageDimensions } from '@/lib/imageUtils'
import { MAX_FILE_SIZE_MB, MAX_SAFE_DIMENSION } from '@/lib/constants'
import { useRouter, useParams } from 'next/navigation'
import type { BatchFile } from '@/types'

const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/svg+xml']

export function useImageUpload() {
  const setImage = useCropStore((s) => s.setImage)
  const setBatchFiles = useCropStore((s) => s.setBatchFiles)
  const router = useRouter()
  const params = useParams()
  const locale = (params?.locale as string) ?? 'en'

  const processFile = useCallback(async (
    file: File,
    onDownsampleConfirm?: (w: number, h: number) => Promise<boolean>
  ) => {
    if (!SUPPORTED_TYPES.includes(file.type)) {
      toast.error('Unsupported format. Please upload JPG, PNG, WEBP, GIF, BMP, or SVG.')
      return
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error('File too large. Maximum size is 20 MB.')
      return
    }

    try {
      let dataUrl = await correctExifOrientation(file)
      const { width, height } = await getImageDimensions(dataUrl)

      if (Math.max(width, height) > MAX_SAFE_DIMENSION) {
        const confirmed = onDownsampleConfirm ? await onDownsampleConfirm(width, height) : true
        if (confirmed) {
          dataUrl = await downsampleDataUrl(dataUrl)
        }
      }

      setImage(file, dataUrl)
      router.push(`/${locale}/editor`)
    } catch {
      toast.error('Could not read file. The file may be corrupted.')
    }
  }, [setImage, router, locale])

  const processUrl = useCallback(async (
    url: string,
    onDownsampleConfirm?: (w: number, h: number) => Promise<boolean>
  ) => {
    if (!url.trim()) return

    // Route through server-side proxy to bypass CORS restrictions
    try {
      const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(url)}`
      const res = await fetch(proxyUrl)
      if (!res.ok) throw new Error(`proxy-${res.status}`)
      const blob = await res.blob()
      const filename = url.split('/').pop()?.split('?')[0] || 'image'
      const file = new File([blob], filename, { type: blob.type })
      await processFile(file, onDownsampleConfirm)
    } catch {
      toast.error('Failed to load image. Check the URL or download the image and upload it directly.')
    }
  }, [processFile])

  /** Batch-upload multiple files → navigate to /batch */
  const processBatchFiles = useCallback(async (files: File[]) => {
    const valid = files.filter((f) => {
      if (!SUPPORTED_TYPES.includes(f.type)) {
        toast.error(`Skipped ${f.name}: unsupported format.`)
        return false
      }
      if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        toast.error(`Skipped ${f.name}: file too large (max 20 MB).`)
        return false
      }
      return true
    })
    if (valid.length === 0) return

    const entries: BatchFile[] = valid.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      status: 'waiting',
    }))
    setBatchFiles(entries)
    router.push(`/${locale}/batch`)
  }, [setBatchFiles, router, locale])

  return { processFile, processUrl, processBatchFiles }
}
