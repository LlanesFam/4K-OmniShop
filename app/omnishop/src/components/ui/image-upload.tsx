/**
 * ImageUpload
 *
 * Drag-and-drop or click-to-upload image component backed by Cloudinary.
 * Accepts a current URL for preview and calls onUpload with the new secure URL.
 */
import React, { useRef, useState, useCallback } from 'react'
import { Upload, X, Loader2, ImageIcon, WifiOff } from 'lucide-react'
import { uploadImage, type CloudinaryFolder } from '@/lib/cloudinaryService'
import { ImageCropModal } from '@/components/ui/image-crop-modal'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { cn } from '@/lib/utils'

const ASPECT_NUMBERS: Record<'square' | 'banner' | 'product', number> = {
  square: 1,
  banner: 4,
  product: 3 / 4
}

interface ImageUploadProps {
  /** Current image URL (shown as preview) */
  value?: string
  /** Called with the Cloudinary secure URL after a successful upload */
  onUpload: (url: string) => void
  /** Folder inside Cloudinary to organise uploads */
  folder: CloudinaryFolder
  /** Aspect ratio of the preview/drop zone */
  aspectRatio?: 'square' | 'banner' | 'product'
  /** Extra class names on the root element */
  className?: string
  /** Disabled state */
  disabled?: boolean
  /** Label shown inside the drop zone */
  label?: string
  /** When true, opens a crop/zoom modal before uploading */
  cropEnabled?: boolean
}

const ASPECT_CLASSES: Record<NonNullable<ImageUploadProps['aspectRatio']>, string> = {
  square: 'aspect-square',
  banner: 'aspect-[4/1]',
  product: 'aspect-[3/4]'
}

const MAX_FILE_SIZE_MB = 5
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export function ImageUpload({
  value,
  onUpload,
  folder,
  aspectRatio = 'square',
  className,
  disabled = false,
  label = 'Upload image',
  cropEnabled = false
}: ImageUploadProps): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const isOnline = useNetworkStatus()
  // Combine all disabled conditions into one flag used throughout the component
  const isDisabled = disabled || uploading || !isOnline

  const processFile = useCallback(
    async (file: File) => {
      setError(null)

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError('Only JPEG, PNG, WebP, or GIF files are supported.')
        return
      }
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setError(`File must be smaller than ${MAX_FILE_SIZE_MB} MB.`)
        return
      }

      setUploading(true)
      try {
        const result = await uploadImage(file, folder)
        onUpload(result.secureUrl)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Upload failed. Please try again.')
      } finally {
        setUploading(false)
      }
    },
    [folder, onUpload]
  )

  const openCropFor = useCallback((file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Only JPEG, PNG, WebP, or GIF files are supported.')
      return
    }
    const url = URL.createObjectURL(file)
    setCropSrc(url)
  }, [])

  const handleCropApply = useCallback(
    async (blob: Blob) => {
      if (cropSrc) URL.revokeObjectURL(cropSrc)
      setCropSrc(null)
      const file = new File([blob], 'upload.jpg', { type: 'image/jpeg' })
      await processFile(file)
    },
    [cropSrc, processFile]
  )

  const handleCropCancel = useCallback(() => {
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
  }, [cropSrc])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0]
    if (file) {
      if (cropEnabled) openCropFor(file)
      else void processFile(file)
    }
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      if (cropEnabled) openCropFor(file)
      else void processFile(file)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault()
    setDragging(true)
  }

  const handleDragLeave = (): void => setDragging(false)

  const handleClear = (e: React.MouseEvent): void => {
    e.stopPropagation()
    onUpload('')
    setError(null)
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={isDisabled ? -1 : 0}
        aria-label={label}
        onClick={() => !isDisabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (!isDisabled && (e.key === 'Enter' || e.key === ' ')) inputRef.current?.click()
        }}
        onDrop={!isDisabled ? handleDrop : undefined}
        onDragOver={!isDisabled ? handleDragOver : undefined}
        onDragLeave={!isDisabled ? handleDragLeave : undefined}
        className={cn(
          'relative w-full overflow-hidden rounded-lg border-2 border-dashed transition-colors',
          ASPECT_CLASSES[aspectRatio],
          isDisabled
            ? 'cursor-not-allowed opacity-50'
            : 'cursor-pointer hover:border-primary/50 hover:bg-primary/5',
          dragging ? 'border-primary bg-primary/5' : 'border-border bg-muted/30',
          value && 'border-solid border-border'
        )}
      >
        {/* Offline overlay — shown when internet is unavailable */}
        {!isOnline && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 rounded-lg bg-background/80 backdrop-blur-sm">
            <WifiOff className="size-5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">No internet connection</p>
          </div>
        )}
        {/* Preview */}
        {value && (
          <img
            src={value}
            alt="Upload preview"
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}

        {/* Overlay when no image or uploading */}
        {(!value || uploading) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
            {uploading ? (
              <>
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Uploading…</p>
              </>
            ) : (
              <>
                {value ? (
                  <ImageIcon className="size-6 text-muted-foreground/60" />
                ) : (
                  <Upload className="size-6 text-muted-foreground/60" />
                )}
                <p className="text-xs text-center text-muted-foreground leading-snug">
                  {label}
                  <br />
                  <span className="text-[10px] text-muted-foreground/60">
                    JPEG, PNG, WebP · max {MAX_FILE_SIZE_MB} MB
                  </span>
                </p>
              </>
            )}
          </div>
        )}

        {/* Hover overlay on existing image */}
        {value && !uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100">
            <p className="text-xs font-medium text-white">Click to replace</p>
          </div>
        )}

        {/* Clear button */}
        {value && !isDisabled && (
          <button
            type="button"
            onClick={handleClear}
            title="Remove image"
            className="absolute top-2 right-2 z-10 flex size-6 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Crop modal */}
      {cropSrc && (
        <ImageCropModal
          imageSrc={cropSrc}
          aspect={ASPECT_NUMBERS[aspectRatio]}
          onApply={(blob) => void handleCropApply(blob)}
          onCancel={handleCropCancel}
        />
      )}

      {/* Error */}
      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        className="sr-only"
        onChange={handleFileChange}
        disabled={isDisabled}
      />
    </div>
  )
}
