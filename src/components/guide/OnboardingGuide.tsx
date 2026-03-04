'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, Crop, Scan, Download } from 'lucide-react'

const DEFAULT_STORAGE_KEY = 'imagecrop-onboarding-done'

interface Step {
  icon: React.ReactNode
  title: string
  desc: string
}

const STEPS: Step[] = [
  {
    icon: <Upload className="w-8 h-8 text-primary" />,
    title: 'Upload Your Image',
    desc: 'Drag & drop, paste from clipboard, or enter a URL. Supports JPG, PNG, WEBP, GIF, BMP, and SVG.',
  },
  {
    icon: <Crop className="w-8 h-8 text-primary" />,
    title: 'Crop & Adjust',
    desc: 'Choose free-form, preset ratios, or custom dimensions. Rotate and flip with the left panel controls.',
  },
  {
    icon: <Scan className="w-8 h-8 text-primary" />,
    title: 'AI Face Detection',
    desc: 'Click "Detect Faces" to automatically find faces. Apply a single face or all faces to set the crop box.',
  },
  {
    icon: <Download className="w-8 h-8 text-primary" />,
    title: 'Export',
    desc: 'Choose JPG, PNG, or WEBP format. Adjust quality and filename, then download your cropped image.',
  },
]

interface Props {
  /** First step index to show (0-based, inclusive). */
  startStep?: number
  /** Last step index to show (0-based, inclusive). */
  endStep?: number
  /** localStorage key used to persist completion. */
  storageKey?: string
  /**
   * When true, force the guide to show immediately (bypass localStorage check).
   * Useful when a parent component controls visibility (e.g., Help button).
   */
  forceOpen?: boolean
  /** Called after the guide is dismissed (finished or skipped). */
  onDismiss?: () => void
}

export default function OnboardingGuide({
  startStep = 0,
  endStep = STEPS.length - 1,
  storageKey = DEFAULT_STORAGE_KEY,
  forceOpen = false,
  onDismiss,
}: Props) {
  const [visible, setVisible] = useState(false)
  const [stepIndex, setStepIndex] = useState(startStep)

  // Auto-show on first visit (localStorage-driven)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!localStorage.getItem(storageKey)) setVisible(true)
  }, [storageKey])

  // Controlled open: when forceOpen becomes true, show and reset to startStep
  useEffect(() => {
    if (!forceOpen) return
    setStepIndex(startStep)
    setVisible(true)
  }, [forceOpen, startStep])

  if (!visible) return null

  const step = STEPS[stepIndex]
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
          aria-label="Skip guide"
        >
          Skip guide ✕
        </button>

        {/* Step dots */}
        <div className="flex gap-1.5 mt-1">
          {STEPS.slice(startStep, endStep + 1).map((_, i) => (
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
          {step.icon}
        </div>

        {/* Text */}
        <div>
          <p className="font-semibold text-base mb-1">{step.title}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
        </div>

        {/* Step counter */}
        <p className="text-xs text-muted-foreground">
          Step {stepIndex + 1} of {STEPS.length}
        </p>

        {/* Action */}
        <Button onClick={handleNext} className="w-full">
          {isLast ? 'Get started' : 'Next →'}
        </Button>
      </div>
    </div>
  )
}
