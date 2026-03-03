/**
 * Web Worker: face detection via face-api.js (TinyFaceDetector).
 *
 * face-api.js is loaded lazily inside the message handler to avoid
 * module-level side effects that would break Next.js SSR analysis.
 */

// ── Browser polyfills ────────────────────────────────────────────────────────
// MUST be at module level so they run before @tensorflow/tfjs (bundled inside
// face-api.js) evaluates its environment-detection code. Next.js/Webpack may
// evaluate TF.js module-level code (ENV registration) at worker load time —
// before any async function fires — so placing these inside ensureFaceapi()
// was too late, causing "getEnv - environment is not defined".
// We stub just enough to let TF.js register its browser platform and then
// fall back to the CPU backend (WebGL is unavailable in a Web Worker).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g = globalThis as any
if (typeof g.window === 'undefined') {
  g.window = globalThis
  g.document = {
    createElement: (tag: string) =>
      tag === 'canvas'
        ? { getContext: () => null, style: {}, width: 0, height: 0 }
        : {},
    createElementNS: () => ({}),
  }
  g.navigator               = { userAgent: '', platform: '' }
  g.HTMLCanvasElement       = class {}
  g.HTMLVideoElement        = class {}
  g.HTMLImageElement        = class {}
  // face-api.js isBrowser() also requires ImageData and CanvasRenderingContext2D
  g.ImageData               = class {}
  g.CanvasRenderingContext2D = class {}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFaceapi = any

let modelsLoaded = false
let faceapi: AnyFaceapi = null

async function ensureFaceapi(): Promise<AnyFaceapi> {
  if (faceapi) return faceapi

  faceapi = await import('face-api.js')

  // Force the CPU backend — WebGL is unavailable inside a Web Worker.
  await faceapi.tf.setBackend('cpu')
  await faceapi.tf.ready()

  return faceapi
}

async function ensureModels(fa: AnyFaceapi): Promise<void> {
  if (modelsLoaded) return
  await fa.nets.tinyFaceDetector.loadFromUri('/models')
  modelsLoaded = true
}

interface FaceResult {
  x: number; y: number; width: number; height: number; confidence: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const post = (msg: any) => (self as unknown as Worker).postMessage(msg)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(self as any).onmessage = async (evt: MessageEvent) => {
  if (evt.data?.type !== 'detect') return

  try {
    const fa = await ensureFaceapi()

    if (!modelsLoaded) {
      post({ type: 'loading' })
      await ensureModels(fa)
      post({ type: 'modelsReady' })  // 'modelsReady' triggers 'detecting' phase in client
    } else {
      // Models already cached — notify main thread we are entering detection
      post({ type: 'detecting' })
    }

    const { pixels, width, height } = evt.data as {
      type: string; pixels: ArrayBuffer; width: number; height: number
    }
    const rgba = new Uint8Array(pixels)

    // Build (H, W, 3) Uint8Array by stripping the alpha channel
    const rgb = new Uint8Array(width * height * 3)
    for (let i = 0; i < width * height; i++) {
      rgb[i * 3]     = rgba[i * 4]
      rgb[i * 3 + 1] = rgba[i * 4 + 1]
      rgb[i * 3 + 2] = rgba[i * 4 + 2]
    }

    const tensor = fa.tf.tensor3d(rgb, [height, width, 3])

    const detections = await fa.detectAllFaces(
      tensor,
      new fa.TinyFaceDetectorOptions({ scoreThreshold: 0.45, inputSize: 320 }),
    )

    tensor.dispose()

    post({
      type: 'result',
      faces: detections.map((d: AnyFaceapi) => ({
        x: Math.round(d.box.x),
        y: Math.round(d.box.y),
        width: Math.round(d.box.width),
        height: Math.round(d.box.height),
        confidence: d.score,
      } as FaceResult)),
    })
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : 'Detection failed' })
  }
}
