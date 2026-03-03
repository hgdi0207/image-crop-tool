'use client'

import { Scan, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCropStore } from '@/store/cropStore'

interface Props {
  /** Called when the user clicks "Detect Faces". */
  onDetect: () => void
  /**
   * Called when the user clicks "Apply to Crop".
   * faceIndex is the specific face index, or 'all' to encompass all faces.
   */
  onApply: (faceIndex: number | 'all') => void
}

/** Indeterminate sliding progress bar (keyframe defined in globals.css). */
function IndeterminateBar() {
  return (
    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-primary/20">
      <div
        className="absolute h-full bg-primary rounded-full"
        style={{ animation: 'ai-progress-run 1.4s ease-in-out infinite' }}
      />
    </div>
  )
}

export default function FaceDetectPanel({ onDetect, onApply }: Props) {
  const status   = useCropStore((s) => s.faceDetectStatus)
  const faces    = useCropStore((s) => s.faceDetections)
  const focused  = useCropStore((s) => s.focusedFaceIndex)
  const setFocused = useCropStore((s) => s.setFocusedFaceIndex)

  const workerSupported = typeof Worker !== 'undefined'
  const isRunning = status === 'loading' || status === 'detecting'

  return (
    <section className="p-3 border-t">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        AI Face Detect
      </p>

      {/* ── Worker not available (low-end device or unsupported browser) ── */}
      {!workerSupported && (
        <p className="text-[10px] text-muted-foreground leading-tight">
          AI unavailable — Web Workers are not supported on this device.
        </p>
      )}

      {/* ── Idle ── */}
      {workerSupported && status === 'idle' && (
        <div className="space-y-1.5">
          <Button
            variant="outline" size="sm" className="w-full text-xs gap-1.5"
            onClick={onDetect}
          >
            <Scan className="w-3.5 h-3.5" />
            Detect Faces
          </Button>
          <p className="text-[10px] text-muted-foreground leading-tight">
            First use downloads ~200&thinsp;KB of AI models.
          </p>
        </div>
      )}

      {/* ── Loading / Detecting ── */}
      {workerSupported && isRunning && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {status === 'loading' ? 'Loading AI models…' : 'Detecting faces…'}
          </p>
          <IndeterminateBar />
          {status === 'loading' && (
            <p className="text-[10px] text-muted-foreground leading-tight">
              First load may take 5–10 s
            </p>
          )}
        </div>
      )}

      {/* ── Error ── */}
      {workerSupported && status === 'error' && (
        <div className="space-y-1.5">
          <Button
            variant="outline" size="sm" className="w-full text-xs gap-1.5"
            onClick={onDetect}
          >
            <Scan className="w-3.5 h-3.5" />
            Detect Faces
          </Button>
          <p className="text-[10px] text-destructive leading-tight">
            Detection failed. Check that model files exist in&nbsp;
            <code className="font-mono">/public/models/</code>.
          </p>
          <p className="text-[10px] text-muted-foreground leading-tight">
            Possible causes: no faces in image, or low device performance.
          </p>
        </div>
      )}

      {/* ── Done ── */}
      {workerSupported && status === 'done' && (
        <div className="space-y-2">
          {faces.length === 0 ? (
            <>
              <p className="text-xs text-muted-foreground">No faces detected.</p>
              <p className="text-[10px] text-muted-foreground leading-tight">
                Try a photo with a clear, front-facing face.
              </p>
              <Button
                variant="ghost" size="sm" className="w-full text-xs gap-1"
                onClick={onDetect}
              >
                <RotateCcw className="w-3 h-3" />
                Retry
              </Button>
            </>
          ) : (
            <>
              {/* Face count + confidence */}
              <p className="text-xs text-muted-foreground">
                {faces.length} face{faces.length > 1 ? 's' : ''} detected
                {' '}—{' '}
                {Math.round(
                  (faces.length > 1 ? faces[focused] : faces[0]).confidence * 100,
                )}% conf.
              </p>

              {/* Multi-face navigation */}
              {faces.length > 1 && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost" size="icon" className="h-6 w-6 shrink-0"
                    disabled={focused === 0}
                    onClick={() => setFocused(focused - 1)}
                    title="Previous face"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                  <span className="flex-1 text-center text-xs text-muted-foreground">
                    Face {focused + 1} / {faces.length}
                  </span>
                  <Button
                    variant="ghost" size="icon" className="h-6 w-6 shrink-0"
                    disabled={focused === faces.length - 1}
                    onClick={() => setFocused(focused + 1)}
                    title="Next face"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}

              {/* Apply buttons */}
              <Button
                size="sm" className="w-full text-xs"
                onClick={() => onApply(focused)}
                title={
                  faces.length > 1
                    ? `Apply face ${focused + 1} to crop box`
                    : 'Apply detected face to crop box'
                }
              >
                Apply to Crop
              </Button>

              {faces.length > 1 && (
                <Button
                  variant="outline" size="sm" className="w-full text-xs"
                  onClick={() => onApply('all')}
                  title="Encompass all detected faces"
                >
                  Apply All Faces
                </Button>
              )}

              {/* Re-detect */}
              <Button
                variant="ghost" size="sm" className="w-full text-xs gap-1"
                onClick={onDetect}
              >
                <RotateCcw className="w-3 h-3" />
                Re-detect
              </Button>
            </>
          )}
        </div>
      )}
    </section>
  )
}
