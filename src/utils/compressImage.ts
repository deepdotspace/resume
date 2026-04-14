/**
 * compressImage — Resize and compress images for resume photo (Europass).
 *
 * Max dimension: 500px. Max size: 200KB. Uses canvas + JPEG export.
 */

const MAX_DIMENSION = 500
const MAX_SIZE_BYTES = 200 * 1024
const DEFAULT_QUALITY = 0.85
const MIN_QUALITY = 0.2
const QUALITY_STEP = 0.1

function getBase64Size(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1]
  if (!base64) return 0
  return (base64.length * 3) / 4
}

export async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const { width, height } = img
      let w = width
      let h = height
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          w = MAX_DIMENSION
          h = Math.round((height * MAX_DIMENSION) / width)
        } else {
          h = MAX_DIMENSION
          w = Math.round((width * MAX_DIMENSION) / height)
        }
      }
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas not supported'))
        return
      }
      ctx.drawImage(img, 0, 0, w, h)

      let quality = DEFAULT_QUALITY
      let dataUrl = canvas.toDataURL('image/jpeg', quality)

      while (getBase64Size(dataUrl) > MAX_SIZE_BYTES && quality > MIN_QUALITY) {
        quality -= QUALITY_STEP
        dataUrl = canvas.toDataURL('image/jpeg', quality)
      }

      resolve(dataUrl)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    img.src = url
  })
}

/**
 * Extract raw base64 from a data URL for use with latex-compile API.
 * Returns { base64, path } where path is the filename for LaTeX.
 */
export function parsePhotoDataUrl(dataUrl: string): { base64: string; path: string } | null {
  const input = dataUrl?.trim() || ''
  if (!input.startsWith('data:image/')) return null
  const match = input.match(/^data:image\/(jpeg|jpg|png);base64,(.+)$/i)
  if (!match) return null
  const ext = match[1]?.toLowerCase() === 'png' ? 'png' : 'jpg'
  return { base64: match[2], path: `photo.${ext}` }
}
