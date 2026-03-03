/**
 * Main-thread wrapper for the faceDetect Web Worker.
 *
 * Lazily creates the Worker on first call and reuses it across calls.
 * Converts correctedDataUrl → pixel buffer → Worker → FaceDetection[].
 */
import type { FaceDetection } from '@/types'

// Singleton worker instance
let worker: Worker | null = null

function getWorker(): Worker {
  if (typeof Worker === 'undefined') throw new Error('Web Worker not supported')
  if (!worker) {
    worker = new Worker(
      new URL('../workers/faceDetect.worker.ts', import.meta.url),
      { type: 'module' },
    )
  }
  return worker
}

/**
 * Run face detection on the given image data URL.
 *
 * @param dataUrl  - correctedDataUrl from the store (EXIF-corrected, full res)
 * @param onPhase  - called when internal phase changes (for UI state updates)
 * @param maxDim   - downsample cap for detection (smaller = faster, default 1024)
 * @returns array of FaceDetection in ORIGINAL image coordinates
 */
export function detectFaces(
  dataUrl: string,
  onPhase: (phase: 'loading' | 'detecting') => void,
  maxDim = 1024,
): Promise<FaceDetection[]> {
  return new Promise((resolve, reject) => {
    const img = new Image()

    img.onload = () => {
      // Downsample so the worker gets a reasonably-sized input
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      const imageData = ctx.getImageData(0, 0, w, h)

      // Clone the ArrayBuffer so we can transfer it without leaving the main
      // thread's copy neutered (canvas can still be GC'd)
      const buffer = imageData.data.buffer.slice(0)

      const wk = getWorker()

      const onMsg = (evt: MessageEvent) => {
        const msg = evt.data
        if (msg.type === 'loading') {
          onPhase('loading')
        } else if (msg.type === 'modelsReady' || msg.type === 'detecting') {
          onPhase('detecting')
        } else if (msg.type === 'result') {
          wk.removeEventListener('message', onMsg)
          wk.removeEventListener('error', onErr)
          // Scale coordinates back to original image resolution
          resolve(
            (msg.faces as FaceDetection[]).map((f) => ({
              x: Math.round(f.x / scale),
              y: Math.round(f.y / scale),
              width: Math.round(f.width / scale),
              height: Math.round(f.height / scale),
              confidence: f.confidence,
            })),
          )
        } else if (msg.type === 'error') {
          wk.removeEventListener('message', onMsg)
          wk.removeEventListener('error', onErr)
          reject(new Error(msg.message as string))
        }
      }

      const onErr = (err: ErrorEvent) => {
        wk.removeEventListener('message', onMsg)
        wk.removeEventListener('error', onErr)
        reject(new Error(err.message))
      }

      wk.addEventListener('message', onMsg)
      wk.addEventListener('error', onErr)

      // Transfer the buffer to the worker (zero-copy)
      wk.postMessage({ type: 'detect', pixels: buffer, width: w, height: h }, [buffer])
    }

    img.onerror = () => reject(new Error('Failed to load image for detection'))
    img.src = dataUrl
  })
}

/** Call on editor unmount to free Worker resources. */
export function terminateDetectWorker() {
  worker?.terminate()
  worker = null
}
