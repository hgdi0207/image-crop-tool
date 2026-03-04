'use client'

import { useTranslations } from 'next-intl'
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
  const t = useTranslations('editor.ai')
  const status   = useCropStore((s) => s.faceDetectStatus)
  const faces    = useCropStore((s) => s.faceDetections)
  const focused  = useCropStore((s) => s.focusedFaceIndex)
  const setFocused = useCropStore((s) => s.setFocusedFaceIndex)

  const workerSupported = typeof Worker !== 'undefined'
  const isRunning = status === 'loading' || status === 'detecting'

  return (
    <section className="p-3 border-t">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        {t('title')}
      </p>

      {/* ── Worker not available (low-end device or unsupported browser) ── */}
      {!workerSupported && (
        <p className="text-[10px] text-muted-foreground leading-tight">
          {t('unavailable')}
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
            {t('detect')}
          </Button>
          <p className="text-[10px] text-muted-foreground leading-tight">
            {t('firstUse')}
          </p>
        </div>
      )}

      {/* ── Loading / Detecting ── */}
      {workerSupported && isRunning && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {status === 'loading' ? t('loadingModels') : t('detecting')}
          </p>
          <IndeterminateBar />
          {status === 'loading' && (
            <p className="text-[10px] text-muted-foreground leading-tight">
              {t('firstLoad')}
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
            {t('detect')}
          </Button>
          <p className="text-[10px] text-destructive leading-tight">
            {t('errorMsg')}
          </p>
          <p className="text-[10px] text-muted-foreground leading-tight">
            {t('errorHint')}
          </p>
        </div>
      )}

      {/* ── Done ── */}
      {workerSupported && status === 'done' && (
        <div className="space-y-2">
          {faces.length === 0 ? (
            <>
              <p className="text-xs text-muted-foreground">{t('noFaces')}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">
                {t('noFacesHint')}
              </p>
              <Button
                variant="ghost" size="sm" className="w-full text-xs gap-1"
                onClick={onDetect}
              >
                <RotateCcw className="w-3 h-3" />
                {t('retry')}
              </Button>
            </>
          ) : (
            <>
              {/* Face count + confidence */}
              <p className="text-xs text-muted-foreground">
                {t(faces.length === 1 ? 'facesDetectedSingle' : 'facesDetectedMultiple', {
                  count: faces.length,
                  conf: Math.round((faces.length > 1 ? faces[focused] : faces[0]).confidence * 100),
                })}
              </p>

              {/* Multi-face navigation */}
              {faces.length > 1 && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost" size="icon" className="h-6 w-6 shrink-0"
                    disabled={focused === 0}
                    onClick={() => setFocused(focused - 1)}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                  <span className="flex-1 text-center text-xs text-muted-foreground">
                    {t('faceNav', { current: focused + 1, total: faces.length })}
                  </span>
                  <Button
                    variant="ghost" size="icon" className="h-6 w-6 shrink-0"
                    disabled={focused === faces.length - 1}
                    onClick={() => setFocused(focused + 1)}
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}

              {/* Apply buttons */}
              <Button
                size="sm" className="w-full text-xs"
                onClick={() => onApply(focused)}
              >
                {t('applyToCrop')}
              </Button>

              {faces.length > 1 && (
                <Button
                  variant="outline" size="sm" className="w-full text-xs"
                  onClick={() => onApply('all')}
                >
                  {t('applyAll')}
                </Button>
              )}

              {/* Re-detect */}
              <Button
                variant="ghost" size="sm" className="w-full text-xs gap-1"
                onClick={onDetect}
              >
                <RotateCcw className="w-3 h-3" />
                {t('redetect')}
              </Button>
            </>
          )}
        </div>
      )}
    </section>
  )
}
