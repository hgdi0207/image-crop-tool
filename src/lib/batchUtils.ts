import type { ExportFormat } from '@/types'
import { getCroppedBlob } from '@/lib/exportUtils'
import { correctExifOrientation } from '@/lib/imageUtils'

export interface BatchCropResult {
  blob: Blob
  width: number
  height: number
}

/**
 * Load a File, correct EXIF, apply a center-crop for the given aspect ratio,
 * and export as a Blob.
 *
 * @param file        - source image File
 * @param ratio       - target W/H ratio; null means keep full image
 * @param format      - output format
 * @param quality     - 0–100
 * @param bgColor     - background color for JPG transparency fill
 */
export async function batchCropFile(
  file: File,
  ratio: number | null,
  format: ExportFormat,
  quality: number,
  bgColor = '#ffffff',
): Promise<BatchCropResult> {
  // 1. EXIF-correct the image
  const dataUrl = await correctExifOrientation(file)

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = async () => {
      try {
        const { naturalWidth: W, naturalHeight: H } = img

        // 2. Compute crop region (center crop)
        let sx = 0, sy = 0, sw = W, sh = H
        if (ratio !== null) {
          if (W / H > ratio) {
            // Image is wider than target ratio → crop width
            sw = Math.round(H * ratio)
            sh = H
            sx = Math.round((W - sw) / 2)
            sy = 0
          } else {
            // Image is taller → crop height
            sw = W
            sh = Math.round(W / ratio)
            sx = 0
            sy = Math.round((H - sh) / 2)
          }
        }

        // 3. Draw cropped region onto output canvas
        const canvas = document.createElement('canvas')
        canvas.width = sw
        canvas.height = sh
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)

        // 4. Export to Blob
        const blob = await getCroppedBlob(canvas, format, quality, bgColor)
        resolve({ blob, width: sw, height: sh })
      } catch (err) {
        reject(err)
      }
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = dataUrl
  })
}

/**
 * Pack an array of {filename, blob} into a ZIP and trigger download.
 */
export async function downloadAsZip(
  items: { filename: string; blob: Blob }[],
  zipName = 'batch-crop',
): Promise<void> {
  const JSZip = (await import('jszip')).default
  const zip = new JSZip()
  for (const { filename, blob } of items) {
    zip.file(filename, blob)
  }
  const zipBlob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(zipBlob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${zipName}.zip`
  a.click()
  URL.revokeObjectURL(url)
}
