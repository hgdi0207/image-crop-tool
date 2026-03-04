'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Upload, Crop, Scan, Download } from 'lucide-react'

const STEP_KEYS = ['upload', 'crop', 'ai', 'export'] as const
const STEP_ICONS = [
  <Upload key="upload" className="w-8 h-8 text-primary" />,
  <Crop key="crop" className="w-8 h-8 text-primary" />,
  <Scan key="ai" className="w-8 h-8 text-primary" />,
  <Download key="export" className="w-8 h-8 text-primary" />,
]

const DEFAULT_STORAGE_KEY = 'imagecrop-onboarding-done'

interface Props {
  startStep?: number
  endStep?: number
  storageKey?: string
  forceOpen?: boolean
  onDismiss?: () => void
}

export default function OnboardingGuide({
  startStep = 0,
  endStep = STEP_KEYS.length - 1,
  storageKey = DEFAULT_STORAGE_KEY,
  forceOpen = false,
  onDismiss,
}: Props) {
  const t = useTranslations('guide')
  const [visible, setVisible] = useState(false)
  const [stepIndex, setStepIndex] = useState(startStep)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!localStorage.getItem(storageKey)) setVisible(true)
  }, [storageKey])

  useEffect(() => {
    if (!forceOpen) return
    setStepIndex(startStep)
    setVisible(true)
  }, [forceOpen, startStep])

  if (!visible) return null

  const stepKey = STEP_KEYS[stepIndex]
  const isLast = stepIndex >= endStep

  const handleNext = () => {
    if (isLast) handleFinish()
    else setStepIndex((i) => i + 1)
  }

  const handleFinish = () => {
    localStorage.setItem(storageKey, '1')
    setVisible(false)
    onDismiss?.()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      aria-modal="true"
      role="dialog"
    >
      <div className="relative bg-background border rounded-xl shadow-2xl w-80 max-w-[90vw] p-6 flex flex-col items-center text-center gap-4">
        {/* Skip button */}
        <button
          onClick={handleFinish}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground text-xs"
          aria-label={t('skip')}
        >
          {t('skip')} ✕
        </button>

        {/* Step dots */}
        <div className="flex gap-1.5 mt-1">
          {STEP_KEYS.slice(startStep, endStep + 1).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === stepIndex - startStep ? 'w-4 bg-primary' : 'w-1.5 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>

        {/* Icon */}
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          {STEP_ICONS[stepIndex]}
        </div>

        {/* Text */}
        <div>
          <p className="font-semibold text-base mb-1">{t(`steps.${stepKey}.title`)}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{t(`steps.${stepKey}.desc`)}</p>
        </div>

        {/* Step counter */}
        <p className="text-xs text-muted-foreground">
          {stepIndex + 1} / {STEP_KEYS.length}
        </p>

        {/* Action */}
        <Button onClick={handleNext} className="w-full">
          {isLast ? t('finish') : t('next')}
        </Button>
      </div>
    </div>
  )
}
