'use client'

import { useCallback } from 'react'
import { toast } from 'sonner'
import { useCropStore } from '@/store/cropStore'
import { correctExifOrientation, downsampleDataUrl, getImageDimensions } from '@/lib/imageUtils'
import { MAX_FILE_SIZE_MB, MAX_SAFE_DIMENSION } from '@/lib/constants'
import { useRouter, useParams } from 'next/navigation'

const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/svg+xml']

export function useImageUpload() {
  const setImage = useCropStore((s) => s.setImage)
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
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject()
        img.src = url
      })
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      canvas.getContext('2d')!.drawImage(img, 0, 0)
      let dataUrl = canvas.toDataURL('image/png')

      if (Math.max(img.naturalWidth, img.naturalHeight) > MAX_SAFE_DIMENSION) {
        const confirmed = onDownsampleConfirm
          ? await onDownsampleConfirm(img.naturalWidth, img.naturalHeight)
          : true
        if (confirmed) dataUrl = await downsampleDataUrl(dataUrl)
      }

      const filename = url.split('/').pop() || 'image'
      const file = new File([new Blob()], filename, { type: 'image/png' })
      setImage(file, dataUrl)
      router.push(`/${locale}/editor`)
    } catch {
      toast.error('Failed to load image. Check the URL or download the image and upload it directly.')
    }
  }, [setImage, router, locale])

  return { processFile, processUrl }
}
