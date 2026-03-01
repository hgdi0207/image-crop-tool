import * as exifr from 'exifr'
import { MAX_SAFE_DIMENSION } from '@/lib/constants'

/**
 * 读取 EXIF 方向值，用 Canvas 校正图片，返回校正后的 dataURL
 */
export async function correctExifOrientation(file: File): Promise<string> {
  const orientation: number = (await exifr.parse(file, ['Orientation']))?.Orientation ?? 1

  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!

      const { naturalWidth: w, naturalHeight: h } = img
      // orientations 5-8 swap width/height
      if (orientation >= 5) {
        canvas.width = h
        canvas.height = w
      } else {
        canvas.width = w
        canvas.height = h
      }

      const transforms: Record<number, () => void> = {
        1: () => {},
        2: () => { ctx.transform(-1, 0, 0, 1, w, 0) },
        3: () => { ctx.transform(-1, 0, 0, -1, w, h) },
        4: () => { ctx.transform(1, 0, 0, -1, 0, h) },
        5: () => { ctx.transform(0, 1, 1, 0, 0, 0) },
        6: () => { ctx.transform(0, 1, -1, 0, h, 0) },
        7: () => { ctx.transform(0, -1, -1, 0, h, w) },
        8: () => { ctx.transform(0, -1, 1, 0, 0, w) },
      }
      ;(transforms[orientation] ?? transforms[1])()
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')) }
    img.src = url
  })
}

/**
 * 将 dataURL 降采样到安全分辨率，返回新的 dataURL
 */
export function downsampleDataUrl(dataUrl: string, maxDim = MAX_SAFE_DIMENSION): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = reject
    img.src = dataUrl
  })
}

/**
 * 从 dataURL 中获取图片的宽高
 */
export function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = reject
    img.src = dataUrl
  })
}
