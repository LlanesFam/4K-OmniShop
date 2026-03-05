/**
 * Cloudinary Image Upload Service
 *
 * Uses unsigned uploads — no server required.
 * Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in .env
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string

export type CloudinaryFolder =
  | 'logos'
  | 'banners'
  | 'products'
  | 'profiles'
  | 'product-placeholders'

export interface CloudinaryUploadResult {
  secureUrl: string
  publicId: string
  width: number
  height: number
}

/**
 * Uploads a file to Cloudinary and returns the secure URL + metadata.
 * Throws if the upload fails or env vars are not configured.
 */
export async function uploadImage(
  file: File,
  folder: CloudinaryFolder
): Promise<CloudinaryUploadResult> {
  if (!CLOUD_NAME || CLOUD_NAME === 'your_cloud_name') {
    throw new Error(
      'Cloudinary is not configured. Set VITE_CLOUDINARY_CLOUD_NAME in your .env file.'
    )
  }
  if (!UPLOAD_PRESET) {
    throw new Error(
      'Cloudinary upload preset is not configured. Set VITE_CLOUDINARY_UPLOAD_PRESET in your .env file.'
    )
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', `omnishop/${folder}`)

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: formData
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: { message: string } }).error?.message ?? 'Upload failed')
  }

  const data = (await res.json()) as {
    secure_url: string
    public_id: string
    width: number
    height: number
  }

  return {
    secureUrl: data.secure_url,
    publicId: data.public_id,
    width: data.width,
    height: data.height
  }
}

/** Returns a Cloudinary transformation URL for a given public_id. */
export function cloudinaryUrl(publicId: string, transforms: string = 'f_auto,q_auto'): string {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transforms}/${publicId}`
}
