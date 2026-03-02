'use client'

import { useState } from 'react'
import {
  RotateCcw, RotateCw, FlipHorizontal2, FlipVertical2,
  RefreshCw, Upload,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { useCropStore } from '@/store/cropStore'
import { PRESET_LIST, PRESET_GROUPS } from '@/lib/constants'
import type { CropMode, CropPreset } from '@/types'

interface Props {
  onReupload: () => void
  onCustomSize: (w: number, h: number) => void
}

export default function LeftPanel({ onReupload, onCustomSize }: Props) {
  const rotation = useCropStore((s) => s.rotation)
  const flipH = useCropStore((s) => s.flipH)
  const flipV = useCropStore((s) => s.flipV)
  const cropMode = useCropStore((s) => s.cropMode)
  const selectedPreset = useCropStore((s) => s.selectedPreset)
  const setRotation = useCropStore((s) => s.setRotation)
  const setFlipH = useCropStore((s) => s.setFlipH)
  const setFlipV = useCropStore((s) => s.setFlipV)
  const resetAdjustments = useCropStore((s) => s.resetAdjustments)
  const setCropMode = useCropStore((s) => s.setCropMode)
  const setSelectedPreset = useCropStore((s) => s.setSelectedPreset)

  const [openGroup, setOpenGroup] = useState<string>('General')
  const [customW, setCustomW] = useState('')
  const [customH, setCustomH] = useState('')

  // Rotate 90° with normalization to -180..180
  const rotate90 = (dir: 1 | -1) => {
    const raw = rotation + dir * 90
    const normalized = raw > 180 ? raw - 360 : raw < -180 ? raw + 360 : raw
    setRotation(normalized)
  }

  const handlePresetSelect = (key: CropPreset) => {
    const preset = PRESET_LIST.find((p) => p.key === key)
    if (!preset) return
    setSelectedPreset(key, preset.ratio)
  }

  const handleCustomInput = (field: 'w' | 'h', val: string) => {
    const newW = field === 'w' ? val : customW
    const newH = field === 'h' ? val : customH
    if (field === 'w') setCustomW(val); else setCustomH(val)
    const w = parseInt(newW)
    const h = parseInt(newH)
    if (w > 0 && h > 0) {
      onCustomSize(w, h)
    }
  }

  return (
    <aside className="w-60 shrink-0 border-r overflow-y-auto flex flex-col bg-background">

      {/* ─── Adjustments ─── */}
      <section className="p-3 border-b">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Adjustments
        </p>

        {/* Rotate + Flip buttons */}
        <div className="grid grid-cols-4 gap-1 mb-3">
          <Button
            variant="outline" size="icon" className="h-8 w-full"
            title="Rotate 90° CCW"
            onClick={() => rotate90(-1)}
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button
            variant="outline" size="icon" className="h-8 w-full"
            title="Rotate 90° CW"
            onClick={() => rotate90(1)}
          >
            <RotateCw className="w-4 h-4" />
          </Button>
          <Button
            variant={flipH ? 'default' : 'outline'} size="icon" className="h-8 w-full"
            title="Flip Horizontal"
            onClick={() => setFlipH(!flipH)}
          >
            <FlipHorizontal2 className="w-4 h-4" />
          </Button>
          <Button
            variant={flipV ? 'default' : 'outline'} size="icon" className="h-8 w-full"
            title="Flip Vertical"
            onClick={() => setFlipV(!flipV)}
          >
            <FlipVertical2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Angle slider */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Angle</span>
            <span>{rotation}°</span>
          </div>
          <Slider
            min={-180} max={180} step={1}
            value={[rotation]}
            onValueChange={([v]) => setRotation(v)}
          />
        </div>

        {/* Reset */}
        <Button
          variant="ghost" size="sm" className="w-full text-xs"
          onClick={resetAdjustments}
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Reset
        </Button>
      </section>

      {/* ─── Crop Mode ─── */}
      <section className="p-3 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Crop Mode
        </p>

        {/* Mode selector */}
        <div className="flex gap-1 mb-3">
          {(['free', 'ratio', 'custom'] as CropMode[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                setCropMode(m)
                if (m === 'free') setSelectedPreset(null, null)
              }}
              className={`flex-1 py-1 text-xs rounded border transition-colors capitalize ${
                cropMode === m
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border hover:border-primary/60 text-muted-foreground'
              }`}
            >
              {m === 'ratio' ? 'Preset' : m === 'custom' ? 'Custom' : 'Free'}
            </button>
          ))}
        </div>

        {/* Preset accordion */}
        {cropMode === 'ratio' && (
          <div className="space-y-1">
            {PRESET_GROUPS.map((group) => (
              <div key={group.label} className="border rounded overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-medium hover:bg-muted/60 transition-colors"
                  onClick={() => setOpenGroup(openGroup === group.label ? '' : group.label)}
                >
                  <span>{group.label}</span>
                  <span className="text-muted-foreground">{openGroup === group.label ? '▼' : '▶'}</span>
                </button>
                {openGroup === group.label && (
                  <div className="p-1.5 pt-0 flex flex-wrap gap-1">
                    {group.keys.map((key) => {
                      const p = PRESET_LIST.find((x) => x.key === key)
                      if (!p) return null
                      return (
                        <button
                          key={key}
                          onClick={() => handlePresetSelect(p.key as CropPreset)}
                          title={p.label}
                          className={`px-1.5 py-0.5 text-xs rounded border transition-colors ${
                            selectedPreset === p.key
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'border-border hover:border-primary/60 text-muted-foreground'
                          }`}
                        >
                          {p.label}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Custom size */}
        {cropMode === 'custom' && (
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Input
                placeholder="W"
                value={customW}
                onChange={(e) => handleCustomInput('w', e.target.value)}
                className="h-7 text-xs"
              />
              <span className="text-muted-foreground text-xs">×</span>
              <Input
                placeholder="H"
                value={customH}
                onChange={(e) => handleCustomInput('h', e.target.value)}
                className="h-7 text-xs"
              />
              <span className="text-muted-foreground text-xs">px</span>
            </div>
          </div>
        )}
      </section>

      {/* ─── Re-upload ─── */}
      <div className="p-3 border-t">
        <Button variant="outline" size="sm" className="w-full text-xs" onClick={onReupload}>
          <Upload className="w-3 h-3 mr-1" />
          Re-upload
        </Button>
      </div>
    </aside>
  )
}
