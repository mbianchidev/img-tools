import type {
  CropRegion,
  FilterSettings,
  ImageFormat,
  WatermarkPosition,
} from '../types/editor'

export interface Dimensions {
  width: number
  height: number
}

export const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value))

export const normalizeRotation = (rotation: number) =>
  ((Math.round(rotation / 90) * 90) % 360 + 360) % 360

export const getRotatedSize = (
  width: number,
  height: number,
  rotation: number,
): Dimensions => {
  const normalized = normalizeRotation(rotation)
  return normalized === 90 || normalized === 270
    ? { width: height, height: width }
    : { width, height }
}

export const getBaseOutputSize = (
  imageWidth: number,
  imageHeight: number,
  crop: CropRegion,
  rotation: number,
): Dimensions => {
  const width = Math.max(1, Math.round(imageWidth * crop.width))
  const height = Math.max(1, Math.round(imageHeight * crop.height))
  return getRotatedSize(width, height, rotation)
}

export const getOutputSize = (
  imageWidth: number,
  imageHeight: number,
  crop: CropRegion,
  rotation: number,
  resizeScale: number,
): Dimensions => {
  const base = getBaseOutputSize(imageWidth, imageHeight, crop, rotation)
  return {
    width: Math.max(1, Math.round(base.width * resizeScale)),
    height: Math.max(1, Math.round(base.height * resizeScale)),
  }
}

export const centerCropForAspect = (
  source: CropRegion,
  aspectRatio: number,
  imageAspectRatio = 1,
): CropRegion => {
  if (
    !Number.isFinite(aspectRatio) ||
    aspectRatio <= 0 ||
    !Number.isFinite(imageAspectRatio) ||
    imageAspectRatio <= 0
  ) {
    return source
  }

  const sourceAspect = (source.width / source.height) * imageAspectRatio
  let width = source.width
  let height = source.height

  if (sourceAspect > aspectRatio) {
    width = (source.height * aspectRatio) / imageAspectRatio
  } else {
    height = (source.width * imageAspectRatio) / aspectRatio
  }

  return {
    x: source.x + (source.width - width) / 2,
    y: source.y + (source.height - height) / 2,
    width,
    height,
  }
}

export const constrainCrop = (crop: CropRegion): CropRegion => {
  const x = clamp(crop.x, 0, 0.95)
  const y = clamp(crop.y, 0, 0.95)
  return {
    x,
    y,
    width: clamp(crop.width, 0.05, 1 - x),
    height: clamp(crop.height, 0.05, 1 - y),
  }
}

export const buildFilterString = (filters: FilterSettings, scale = 1) =>
  [
    `brightness(${filters.brightness}%)`,
    `contrast(${filters.contrast}%)`,
    `saturate(${filters.saturation}%)`,
    `grayscale(${filters.grayscale}%)`,
    `sepia(${filters.sepia}%)`,
    `hue-rotate(${filters.hue}deg)`,
    `blur(${Math.max(0, filters.blur * scale)}px)`,
  ].join(' ')

export const fitWithin = (
  width: number,
  height: number,
  maximum: number,
): Dimensions => {
  if (Math.max(width, height) <= maximum) {
    return { width, height }
  }

  const scale = maximum / Math.max(width, height)
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

export const formatBytes = (bytes: number) => {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = units[0]

  for (let index = 1; index < units.length && value >= 1024; index += 1) {
    value /= 1024
    unit = units[index]
  }

  return `${value.toFixed(value >= 10 ? 1 : 2)} ${unit}`
}

export const getMimeType = (format: ImageFormat) =>
  format === 'png' ? 'image/png' : `image/${format}`

export const getExtension = (format: ImageFormat) =>
  format === 'jpeg' ? 'jpg' : format

export const getFileStem = (filename: string) => {
  const stem = filename.replace(/\.[^/.]+$/, '').trim()
  return stem || 'image'
}

export const getWatermarkAnchor = (
  position: WatermarkPosition,
  width: number,
  height: number,
  padding: number,
) => {
  const anchors = {
    'top-left': { x: padding, y: padding, align: 'left', baseline: 'top' },
    'top-right': {
      x: width - padding,
      y: padding,
      align: 'right',
      baseline: 'top',
    },
    center: {
      x: width / 2,
      y: height / 2,
      align: 'center',
      baseline: 'middle',
    },
    'bottom-left': {
      x: padding,
      y: height - padding,
      align: 'left',
      baseline: 'bottom',
    },
    'bottom-right': {
      x: width - padding,
      y: height - padding,
      align: 'right',
      baseline: 'bottom',
    },
  } as const

  return anchors[position]
}
