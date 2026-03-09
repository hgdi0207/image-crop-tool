'use client'

import { useEffect, useRef, useState } from 'react'
import Cropper from 'react-cropper'
import 'cropperjs/dist/cropper.css'
import type { ReactCropperElement } from 'react-cropper'
import type { CropData } from '@/types'

export interface CropperHandle {
  getCropper: () => Cropper | undefined
  setZoom: (multiplier: number) => void
  getCroppedCanvas: (opts?: Cropper.GetCroppedCanvasOptions) => HTMLCanvasElement | null
  getCropData: () => CropData | null
  queueCropRestore: (data: CropData | null) => void
}

interface CropBoxPos {
  left: number
  top: number
  width: number
  height: number
}

export interface GuideSettings {
  grid: boolean
  thirds: boolean
  golden: boolean
}

interface Props {
  src: string
  aspectRatio: number | null
  rotation: number
  flipH: boolean
  flipV: boolean
  guides: GuideSettings
  showCheckerboard: boolean
  dragMode: 'crop' | 'none' | 'move'
  onCropData: (w: number, h: number) => void
  onZoomChange: (multiplier: number) => void
  onReady: (handle: CropperHandle) => void
  onCropStart?: () => void
  onCropEnd?: () => void
}

export default function CropperCanvas({
  src,
  aspectRatio,
  rotation,
  flipH,
  flipV,
  guides,
  showCheckerboard,
  dragMode,
  onCropData,
  onZoomChange,
  onReady,
  onCropStart,
  onCropEnd,
}: Props) {
  const cropperRef = useRef<ReactCropperElement>(null)
  const readyRef = useRef(false)
  const initZoomRef = useRef<number | null>(null)
  const [cropBox, setCropBox] = useState<CropBoxPos>({ left: 0, top: 0, width: 0, height: 0 })

  // Apply aspect ratio when it changes.
  // cropperjs's setAspectRatio() internally calls initCropBox() which resets the
  // crop box position to the canvas center. Save and restore the current crop data
  // so the box stays where it was (or where setData placed it via setTimeout+rAF).
  useEffect(() => {
    const c = cropperRef.current?.cropper
    if (!c || !readyRef.current) return
    const saved = c.getData()
    c.setAspectRatio(aspectRatio ?? NaN)
    c.setData(saved)
  }, [aspectRatio])

  // Apply drag mode (crop = adjust crop box, move = pan canvas)
  useEffect(() => {
    const c = cropperRef.current?.cropper
    if (!c || !readyRef.current) return
    c.setDragMode(dragMode)
  }, [dragMode])

  // Apply rotation and flip via setData (absolute values)
  useEffect(() => {
    const c = cropperRef.current?.cropper
    if (!c || !readyRef.current) return
    const d = c.getData()
    c.setData({
      ...d,
      rotate: rotation,
      scaleX: flipH ? -1 : 1,
      scaleY: flipV ? -1 : 1,
    })
  }, [rotation, flipH, flipV])

  const updateCropBox = () => {
    const c = cropperRef.current?.cropper
    if (!c) return
    setCropBox(c.getCropBoxData())
    const d = c.getData()
    onCropData(
      Math.max(1, Math.round(Math.abs(d.width))),
      Math.max(1, Math.round(Math.abs(d.height))),
    )
  }

  const handleReady = () => {
    readyRef.current = true
    const c = cropperRef.current?.cropper
    if (!c) return
    const canvas = c.getCanvasData()
    initZoomRef.current = canvas.naturalWidth > 0 ? canvas.width / canvas.naturalWidth : 1
    updateCropBox()
    onReady({
      getCropper: () => cropperRef.current?.cropper,
      setZoom: (multiplier: number) => {
        const init = initZoomRef.current ?? 1
        cropperRef.current?.cropper?.zoomTo(init * multiplier)
      },
      getCroppedCanvas: (opts) => {
        return cropperRef.current?.cropper?.getCroppedCanvas(opts) ?? null
      },
      getCropData: () => {
        const cr = cropperRef.current?.cropper
        if (!cr) return null
        const d = cr.getData()
        return {
          x: d.x,
          y: d.y,
          width: Math.max(1, Math.round(Math.abs(d.width))),
          height: Math.max(1, Math.round(Math.abs(d.height))),
        }
      },
      queueCropRestore: (data) => {
        if (!data) return
        // setTimeout(0) fires after React useEffects, so aspect ratio resets settle first
        setTimeout(() => {
          const cr = cropperRef.current?.cropper
          if (!cr) return
          cr.setData({ x: data.x, y: data.y, width: data.width, height: data.height })
        }, 0)
      },
    })
  }

  const handleZoom = (e: Event | { detail?: { ratio?: number } }) => {
    const ratio = (e as CustomEvent)?.detail?.ratio
    if (ratio === undefined) return
    const init = initZoomRef.current
    if (init && init > 0) onZoomChange(ratio / init)
  }

  const showGuides = guides.grid || guides.thirds || guides.golden

  return (
    <div
      className="relative w-full h-full"
      style={
        showCheckerboard
          ? { background: 'repeating-conic-gradient(#e0e0e0 0% 25%, #fff 0% 50%) 0 0 / 16px 16px' }
          : undefined
      }
    >
      <Cropper
        ref={cropperRef}
        src={src}
        style={{ width: '100%', height: '100%' }}
        aspectRatio={aspectRatio ?? NaN}
        viewMode={1}
        minCropBoxWidth={20}
        minCropBoxHeight={20}
        autoCropArea={0.8}
        guides={false}
        background={!showCheckerboard}
        responsive
        restore={false}
        checkOrientation={false}
        ready={handleReady}
        crop={updateCropBox}
        zoom={handleZoom as Parameters<typeof Cropper>[0]['zoom']}
        cropstart={onCropStart as Parameters<typeof Cropper>[0]['cropstart']}
        cropend={onCropEnd as Parameters<typeof Cropper>[0]['cropend']}
      />

      {showGuides && cropBox.width > 0 && (
        <svg
          className="pointer-events-none absolute"
          style={{
            left: cropBox.left,
            top: cropBox.top,
            width: cropBox.width,
            height: cropBox.height,
          }}
          viewBox={`0 0 ${cropBox.width} ${cropBox.height}`}
          preserveAspectRatio="none"
        >
          {guides.grid && (
            <>
              {[1, 2].map((i) => (
                <line
                  key={`gh${i}`}
                  x1={0} y1={cropBox.height * i / 3}
                  x2={cropBox.width} y2={cropBox.height * i / 3}
                  stroke="rgba(255,255,255,0.4)" strokeWidth="1"
                />
              ))}
              {[1, 2].map((i) => (
                <line
                  key={`gv${i}`}
                  x1={cropBox.width * i / 3} y1={0}
                  x2={cropBox.width * i / 3} y2={cropBox.height}
                  stroke="rgba(255,255,255,0.4)" strokeWidth="1"
                />
              ))}
            </>
          )}
          {guides.thirds && (
            <>
              {[1, 2].map((i) => (
                <line
                  key={`th${i}`}
                  x1={0} y1={cropBox.height * i / 3}
                  x2={cropBox.width} y2={cropBox.height * i / 3}
                  stroke="rgba(255,255,255,0.85)" strokeWidth="1"
                />
              ))}
              {[1, 2].map((i) => (
                <line
                  key={`tv${i}`}
                  x1={cropBox.width * i / 3} y1={0}
                  x2={cropBox.width * i / 3} y2={cropBox.height}
                  stroke="rgba(255,255,255,0.85)" strokeWidth="1"
                />
              ))}
            </>
          )}
          {guides.golden && (
            <>
              {[0.382, 0.618].map((r, i) => (
                <line
                  key={`goh${i}`}
                  x1={0} y1={cropBox.height * r}
                  x2={cropBox.width} y2={cropBox.height * r}
                  stroke="rgba(255,215,0,0.8)" strokeWidth="1"
                />
              ))}
              {[0.382, 0.618].map((r, i) => (
                <line
                  key={`gov${i}`}
                  x1={cropBox.width * r} y1={0}
                  x2={cropBox.width * r} y2={cropBox.height}
                  stroke="rgba(255,215,0,0.8)" strokeWidth="1"
                />
              ))}
            </>
          )}
        </svg>
      )}
    </div>
  )
}
