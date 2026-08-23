import { clamp, getExtension, getMimeType } from './imageMath'
import type { ExportSettings, ImageFormat } from '../types/editor'

export interface ExportResult {
  blob: Blob
  width: number
  height: number
  quality: number
  resizedForTarget: boolean
  targetMet: boolean
}

const getContext = (canvas: HTMLCanvasElement) => {
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Your browser could not prepare the export canvas.')
  }
  return context
}

const canvasToBlob = (
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number,
) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('The browser could not encode this image format.'))
        }
      },
      mimeType,
      quality,
    )
  })

const flattenTransparency = (
  source: HTMLCanvasElement,
  format: ImageFormat,
) => {
  if (format !== 'jpeg') {
    return source
  }

  const canvas = document.createElement('canvas')
  canvas.width = source.width
  canvas.height = source.height
  const context = getContext(canvas)
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(source, 0, 0)
  return canvas
}

const resizeCanvas = (
  source: HTMLCanvasElement,
  width: number,
  height: number,
) => {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  const context = getContext(canvas)
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas
}

export const calculateTargetScale = (currentBytes: number, targetBytes: number) =>
  clamp(Math.sqrt(targetBytes / Math.max(1, currentBytes)) * 0.94, 0.5, 0.94)

const encodeLossyToTarget = async (
  canvas: HTMLCanvasElement,
  mimeType: string,
  targetBytes: number,
) => {
  let low = 0.04
  let high = 0.98
  let quality = high
  let blob = await canvasToBlob(canvas, mimeType, quality)
  let best = blob
  let bestQuality = quality

  for (let attempt = 0; attempt < 9; attempt += 1) {
    quality = (low + high) / 2
    blob = await canvasToBlob(canvas, mimeType, quality)
    if (blob.size <= targetBytes) {
      best = blob
      bestQuality = quality
      low = quality
    } else {
      high = quality
    }
  }

  if (best.size > targetBytes) {
    bestQuality = 0.04
    best = await canvasToBlob(canvas, mimeType, bestQuality)
  }

  return { blob: best, quality: bestQuality }
}

export const exportCanvas = async (
  source: HTMLCanvasElement,
  settings: ExportSettings,
): Promise<ExportResult> => {
  const mimeType = getMimeType(settings.format)
  let canvas = flattenTransparency(source, settings.format)

  if (settings.mode === 'quality') {
    const quality = clamp(settings.quality / 100, 0.04, 1)
    const blob = await canvasToBlob(canvas, mimeType, quality)
    return {
      blob,
      width: canvas.width,
      height: canvas.height,
      quality,
      resizedForTarget: false,
      targetMet: true,
    }
  }

  const targetBytes = Math.max(0.01, settings.targetMegabytes) * 1024 * 1024
  let encoded =
    settings.format === 'png'
      ? { blob: await canvasToBlob(canvas, mimeType), quality: 1 }
      : await encodeLossyToTarget(canvas, mimeType, targetBytes)
  let resizedForTarget = false

  for (
    let attempt = 0;
    encoded.blob.size > targetBytes &&
    attempt < 8 &&
    Math.min(canvas.width, canvas.height) > 64;
    attempt += 1
  ) {
    const scale = calculateTargetScale(encoded.blob.size, targetBytes)
    canvas = resizeCanvas(
      canvas,
      Math.max(64, canvas.width * scale),
      Math.max(64, canvas.height * scale),
    )
    resizedForTarget = true
    encoded =
      settings.format === 'png'
        ? { blob: await canvasToBlob(canvas, mimeType), quality: 1 }
        : await encodeLossyToTarget(canvas, mimeType, targetBytes)
  }

  return {
    blob: encoded.blob,
    width: canvas.width,
    height: canvas.height,
    quality: encoded.quality,
    resizedForTarget,
    targetMet: encoded.blob.size <= targetBytes,
  }
}

export const downloadExport = (
  blob: Blob,
  filenameStem: string,
  format: ImageFormat,
) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filenameStem}-edited.${getExtension(format)}`
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
