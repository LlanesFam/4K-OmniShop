/**
 * ImageCropModal
 *
 * Full-screen overlay modal wrapping react-easy-crop.
 * Gives the user pan, zoom, and rotation controls before committing
 * the cropped image as a Blob.
 */
import React, { useState, useCallback } from 'react'
import ReactCropper from 'react-easy-crop'
import type { Area, Point } from 'react-easy-crop'
import { X, ZoomIn, ZoomOut, RotateCw, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Canvas helper ────────────────────────────────────────────────────────────

async function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', reject)
    img.setAttribute('crossOrigin', 'anonymous')
    img.src = url
  })
}

/**
 * Crops (and optionally rotates) an image data URL to the given pixel area.
 * Returns a JPEG Blob at 92% quality.
 */
async function getCroppedBlob(imageSrc: string, pixelCrop: Area, rotation = 0): Promise<Blob> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2d context not available.')

  // Use a "safe area" large enough that no pixels are lost after rotation
  const maxSize = Math.max(image.width, image.height)
  const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2))

  canvas.width = safeArea
  canvas.height = safeArea

  ctx.translate(safeArea / 2, safeArea / 2)
  ctx.rotate((rotation * Math.PI) / 180)
  ctx.translate(-safeArea / 2, -safeArea / 2)
  ctx.drawImage(image, safeArea / 2 - image.width / 2, safeArea / 2 - image.height / 2)

  const data = ctx.getImageData(0, 0, safeArea, safeArea)

  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height
  ctx.putImageData(
    data,
    Math.round(0 - safeArea / 2 + image.width / 2 - pixelCrop.x),
    Math.round(0 - safeArea / 2 + image.height / 2 - pixelCrop.y)
  )

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas blob is null'))),
      'image/jpeg',
      0.92
    )
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ImageCropModalProps {
  /** Object URL or data URL of the source image */
  imageSrc: string
  /** Desired crop aspect ratio (e.g. 1 for square, 4 for banner, 0.75 for product) */
  aspect: number
  /** Called with the resulting Blob when the user confirms */
  onApply: (blob: Blob) => void
  /** Called when the user dismisses without applying */
  onCancel: () => void
}

export function ImageCropModal({
  imageSrc,
  aspect,
  onApply,
  onCancel
}: ImageCropModalProps): React.JSX.Element {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [applying, setApplying] = useState(false)

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels)
  }, [])

  const handleApply = async (): Promise<void> => {
    if (!croppedAreaPixels) return
    setApplying(true)
    try {
      const blob = await getCroppedBlob(imageSrc, croppedAreaPixels, rotation)
      onApply(blob)
    } finally {
      setApplying(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="relative flex w-full max-w-lg flex-col rounded-xl border bg-card shadow-2xl overflow-hidden mx-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <p className="text-sm font-semibold">Crop &amp; Adjust</p>
          <button
            onClick={onCancel}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Cancel"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Cropper area */}
        <div className="relative h-72 w-full bg-black">
          <ReactCropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        {/* Sliders */}
        <div className="flex flex-col gap-4 px-5 py-4 border-b">
          {/* Zoom */}
          <div className="flex items-center gap-3">
            <ZoomOut className="size-3.5 shrink-0 text-muted-foreground" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.02}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 h-1 accent-primary cursor-pointer"
            />
            <ZoomIn className="size-3.5 shrink-0 text-muted-foreground" />
          </div>

          {/* Rotation */}
          <div className="flex items-center gap-3">
            <RotateCw className="size-3.5 shrink-0 text-muted-foreground" />
            <input
              type="range"
              min={-180}
              max={180}
              step={1}
              value={rotation}
              onChange={(e) => setRotation(Number(e.target.value))}
              className="flex-1 h-1 accent-primary cursor-pointer"
            />
            <button
              onClick={() => setRotation(0)}
              className={cn(
                'shrink-0 rounded px-2 py-0.5 text-[10px] font-medium transition-colors',
                rotation !== 0
                  ? 'bg-muted text-foreground hover:bg-muted/70'
                  : 'text-muted-foreground/40 cursor-default'
              )}
              disabled={rotation === 0}
            >
              {rotation !== 0 ? `${rotation > 0 ? '+' : ''}${rotation}°` : '0°'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3">
          <button
            onClick={onCancel}
            className="rounded-md border px-4 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleApply()}
            disabled={applying || !croppedAreaPixels}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-semibold transition-colors',
              'bg-primary text-primary-foreground hover:bg-primary/90',
              'disabled:cursor-not-allowed disabled:opacity-60'
            )}
          >
            {applying ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Applying…
              </>
            ) : (
              <>
                <Check className="size-3.5" />
                Apply
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
