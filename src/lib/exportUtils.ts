import type { ExportFormat } from '@/types'

/**
 * Render a cropped canvas to a Blob.
 * For JPG, fill transparent areas with bgColor first.
 */
export function getCroppedBlob(
  canvas: HTMLCanvasElement,
  format: ExportFormat,
  quality: number,
  bgColor: string,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const out = document.createElement('canvas')
    out.width = canvas.width
    out.height = canvas.height
    const ctx = out.getContext('2d')
    if (!ctx) { reject(new Error('No 2d context')); return }

    if (format === 'jpg') {
      ctx.fillStyle = bgColor
      ctx.fillRect(0, 0, out.width, out.height)
    }
    ctx.drawImage(canvas, 0, 0)

    const mime =
      format === 'jpg' ? 'image/jpeg' :
      format === 'png' ? 'image/png' :
      'image/webp'

    out.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('toBlob returned null'))
      },
      mime,
      format !== 'png' ? quality / 100 : undefined,
    )
  })
}

/** Trigger a browser download for the given Blob. */
export function downloadBlob(blob: Blob, filename: string, format: ExportFormat): void {
  const ext = format === 'jpg' ? 'jpg' : format === 'png' ? 'png' : 'webp'
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename || 'crop'}.${ext}`
  a.click()
  URL.revokeObjectURL(url)
}

/** Human-readable file size string. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
