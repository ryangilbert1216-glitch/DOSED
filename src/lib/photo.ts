export type AvatarCrop = {
  /** Pan from center, in viewport pixels */
  panX: number
  panY: number
  /** 1 = just covers the circle; higher = zoom in */
  zoom: number
}

export const DEFAULT_AVATAR_CROP: AvatarCrop = { panX: 0, panY: 0, zoom: 1 }

/** Load a File into an HTMLImageElement */
export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read image'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Could not load image'))
      img.onload = () => resolve(img)
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}

/** Scale that makes the image cover a square viewport of size `viewport` at zoom 1 */
export function coverScale(imgW: number, imgH: number, viewport: number) {
  return Math.max(viewport / imgW, viewport / imgH)
}

/**
 * Export the circular crop as a square JPEG data URL.
 * Matches AvatarCropModal preview math (cover + pan + zoom).
 */
export function cropAvatarToDataUrl(
  img: HTMLImageElement,
  crop: AvatarCrop,
  viewport: number,
  outSize = 512,
): string {
  const s = coverScale(img.width, img.height, viewport) * crop.zoom
  const imgLeft = viewport / 2 - (img.width * s) / 2 + crop.panX
  const imgTop = viewport / 2 - (img.height * s) / 2 + crop.panY

  let sx = (0 - imgLeft) / s
  let sy = (0 - imgTop) / s
  let sw = viewport / s
  let sh = viewport / s

  // Clamp source rect inside the image
  if (sx < 0) {
    sw += sx
    sx = 0
  }
  if (sy < 0) {
    sh += sy
    sy = 0
  }
  if (sx + sw > img.width) sw = img.width - sx
  if (sy + sh > img.height) sh = img.height - sy
  sw = Math.max(1, sw)
  sh = Math.max(1, sh)

  const canvas = document.createElement('canvas')
  canvas.width = outSize
  canvas.height = outSize
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No canvas')

  ctx.clearRect(0, 0, outSize, outSize)
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outSize, outSize)
  return canvas.toDataURL('image/jpeg', 0.86)
}

/** Legacy helper: center-crop without interactive framing */
export async function fileToProfileDataUrl(file: File, size = 512): Promise<string> {
  const img = await loadImageFromFile(file)
  return cropAvatarToDataUrl(img, DEFAULT_AVATAR_CROP, size, size)
}
