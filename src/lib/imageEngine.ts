import {
  buildFilterString,
  clamp,
  fitWithin,
  getLayerRenderSize,
  getRotatedSize,
  getWatermarkAnchor,
  normalizeRotation,
} from './imageMath'
import type { BlurShape, EditorState, LoadedImage } from '../types/editor'

interface RenderOptions {
  maxDimension?: number
  applyResize?: boolean
}

interface RGB {
  red: number
  green: number
  blue: number
}

const createCanvas = (width: number, height: number) => {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  return canvas
}

const getContext = (canvas: HTMLCanvasElement) => {
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) {
    throw new Error('Your browser could not start the image canvas.')
  }
  return context
}

const estimateBackgroundColor = (
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): RGB => {
  const block = Math.max(1, Math.min(24, Math.floor(Math.min(width, height) * 0.04)))
  const corners = [
    [0, 0],
    [width - block, 0],
    [0, height - block],
    [width - block, height - block],
  ]

  let red = 0
  let green = 0
  let blue = 0
  let samples = 0

  for (const [startX = 0, startY = 0] of corners) {
    for (let y = startY; y < startY + block; y += 1) {
      for (let x = startX; x < startX + block; x += 1) {
        const offset = (y * width + x) * 4
        if ((pixels[offset + 3] ?? 0) === 0) {
          continue
        }
        red += pixels[offset] ?? 0
        green += pixels[offset + 1] ?? 0
        blue += pixels[offset + 2] ?? 0
        samples += 1
      }
    }
  }

  if (samples === 0) {
    return { red: 255, green: 255, blue: 255 }
  }

  return {
    red: red / samples,
    green: green / samples,
    blue: blue / samples,
  }
}

export const removeConnectedBackgroundPixels = (
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  tolerance: number,
  feather: number,
) => {
  const background = estimateBackgroundColor(pixels, width, height)
  const pixelCount = width * height
  const visited = new Uint8Array(pixelCount)
  const queue = new Int32Array(pixelCount)
  const outerThreshold = tolerance + Math.max(1, feather)
  let head = 0
  let tail = 0

  const distanceAt = (index: number) => {
    const offset = index * 4
    return Math.hypot(
      (pixels[offset] ?? 0) - background.red,
      (pixels[offset + 1] ?? 0) - background.green,
      (pixels[offset + 2] ?? 0) - background.blue,
    ) / Math.sqrt(3)
  }

  const visit = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) {
      return
    }
    const index = y * width + x
    if (visited[index]) {
      return
    }
    visited[index] = 1
    if (distanceAt(index) <= outerThreshold) {
      queue[tail] = index
      tail += 1
    }
  }

  for (let x = 0; x < width; x += 1) {
    visit(x, 0)
    visit(x, height - 1)
  }
  for (let y = 1; y < height - 1; y += 1) {
    visit(0, y)
    visit(width - 1, y)
  }

  while (head < tail) {
    const index = queue[head] ?? 0
    head += 1
    const distance = distanceAt(index)
    const alphaFactor =
      distance <= tolerance
        ? 0
        : clamp((distance - tolerance) / Math.max(1, feather), 0, 1)
    const alphaOffset = index * 4 + 3
    pixels[alphaOffset] = Math.round((pixels[alphaOffset] ?? 255) * alphaFactor)

    const x = index % width
    const y = Math.floor(index / width)
    visit(x - 1, y)
    visit(x + 1, y)
    visit(x, y - 1)
    visit(x, y + 1)
  }

  return pixels
}

const removeBackground = (
  canvas: HTMLCanvasElement,
  tolerance: number,
  feather: number,
) => {
  const context = getContext(canvas)
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
  removeConnectedBackgroundPixels(
    imageData.data,
    canvas.width,
    canvas.height,
    tolerance,
    feather,
  )
  context.putImageData(imageData, 0, 0)
}

const drawVignette = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  amount: number,
) => {
  if (amount <= 0) {
    return
  }

  const gradient = context.createRadialGradient(
    width / 2,
    height / 2,
    Math.min(width, height) * 0.2,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.72,
  )
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
  gradient.addColorStop(1, `rgba(13, 10, 28, ${clamp(amount / 100, 0, 0.9)})`)
  context.fillStyle = gradient
  context.fillRect(0, 0, width, height)
}

const drawBlurAreas = (
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  state: EditorState,
  scale: number,
) => {
  if (state.blurAreas.length === 0) {
    return
  }

  const snapshot = createCanvas(canvas.width, canvas.height)
  getContext(snapshot).drawImage(canvas, 0, 0)

  const traceMask = (
    shape: BlurShape,
    x: number,
    y: number,
    width: number,
    height: number,
  ) => {
    if (shape === 'ellipse') {
      context.ellipse(
        x + width / 2,
        y + height / 2,
        width / 2,
        height / 2,
        0,
        0,
        Math.PI * 2,
      )
      return
    }
    if (shape === 'rounded') {
      context.roundRect(x, y, width, height, Math.min(width, height) * 0.22)
      return
    }
    context.rect(x, y, width, height)
  }

  for (const area of state.blurAreas) {
    const x = area.x * canvas.width
    const y = area.y * canvas.height
    const width = area.width * canvas.width
    const height = area.height * canvas.height
    context.save()
    context.beginPath()
    traceMask(area.shape, x, y, width, height)
    context.clip()
    context.filter = `blur(${Math.max(1, area.amount * scale)}px)`
    context.drawImage(snapshot, 0, 0)
    context.restore()
  }
}

const drawTextLayers = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: EditorState,
) => {
  for (const layer of state.textLayers) {
    const fontSize = Math.max(10, Math.min(width, height) * (layer.size / 100))
    context.save()
    context.translate(layer.x * width, layer.y * height)
    context.rotate((layer.rotation * Math.PI) / 180)
    context.globalAlpha = layer.opacity / 100
    context.fillStyle = layer.color
    context.font = `${layer.weight} ${fontSize}px "DM Sans", sans-serif`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.shadowColor = 'rgba(0, 0, 0, 0.2)'
    context.shadowBlur = fontSize * 0.08
    context.fillText(layer.text, 0, 0, width * 0.9)
    context.restore()
  }
}

const drawStickerLayers = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: EditorState,
) => {
  for (const layer of state.stickerLayers) {
    context.save()
    context.translate(layer.x * width, layer.y * height)
    context.rotate((layer.rotation * Math.PI) / 180)
    context.globalAlpha = layer.opacity / 100

    if (layer.kind === 'image') {
      const size = getLayerRenderSize(width, height, layer.size, layer.aspectRatio)
      context.drawImage(
        layer.image,
        -size.width / 2,
        -size.height / 2,
        size.width,
        size.height,
      )
    } else {
      const fontSize = Math.max(16, Math.min(width, height) * (layer.size / 100))
      context.font = `${fontSize}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.fillText(layer.symbol, 0, 0)
    }

    context.restore()
  }
}

const drawWatermark = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: EditorState,
) => {
  const watermark = state.watermark
  if (!watermark.enabled || !watermark.text.trim()) {
    return
  }

  const fontSize = Math.max(10, Math.min(width, height) * (watermark.size / 100))
  const padding = fontSize
  context.save()
  context.fillStyle = watermark.color
  context.globalAlpha = watermark.opacity / 100
  context.font = `700 ${fontSize}px "DM Sans", sans-serif`

  if (watermark.tiled) {
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.rotate((-24 * Math.PI) / 180)
    const spacingX = Math.max(fontSize * 7, 260)
    const spacingY = Math.max(fontSize * 4, 140)
    for (let y = -height; y < height * 2; y += spacingY) {
      for (let x = -width; x < width * 2; x += spacingX) {
        context.fillText(watermark.text, x, y)
      }
    }
  } else {
    const anchor = getWatermarkAnchor(
      watermark.position,
      width,
      height,
      padding,
    )
    context.textAlign = anchor.align as CanvasTextAlign
    context.textBaseline = anchor.baseline as CanvasTextBaseline
    context.fillText(watermark.text, anchor.x, anchor.y)
  }

  context.restore()
}

export const renderImage = (
  source: LoadedImage,
  state: EditorState,
  options: RenderOptions = {},
) => {
  const sourceX = Math.round(source.width * state.crop.x)
  const sourceY = Math.round(source.height * state.crop.y)
  const sourceWidth = Math.max(1, Math.round(source.width * state.crop.width))
  const sourceHeight = Math.max(1, Math.round(source.height * state.crop.height))
  const fitted = options.maxDimension
    ? fitWithin(sourceWidth, sourceHeight, options.maxDimension)
    : { width: sourceWidth, height: sourceHeight }
  const cropCanvas = createCanvas(fitted.width, fitted.height)
  const cropContext = getContext(cropCanvas)

  cropContext.drawImage(
    source.element,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    fitted.width,
    fitted.height,
  )

  if (state.removeBackground) {
    removeBackground(
      cropCanvas,
      state.backgroundTolerance,
      state.backgroundFeather,
    )
  }

  const resizeScale = options.applyResize ? state.resizeScale : 1
  const rotated = getRotatedSize(
    cropCanvas.width,
    cropCanvas.height,
    state.rotation,
  )
  const canvas = createCanvas(
    rotated.width * resizeScale,
    rotated.height * resizeScale,
  )
  const context = getContext(canvas)

  if (state.backgroundEnabled) {
    context.fillStyle = state.backgroundColor
    context.fillRect(0, 0, canvas.width, canvas.height)
  }

  context.save()
  context.translate(canvas.width / 2, canvas.height / 2)
  context.rotate((normalizeRotation(state.rotation) * Math.PI) / 180)
  context.scale(state.flipX ? -1 : 1, state.flipY ? -1 : 1)
  context.filter = buildFilterString(state.filters, resizeScale)
  context.drawImage(
    cropCanvas,
    (-cropCanvas.width * resizeScale) / 2,
    (-cropCanvas.height * resizeScale) / 2,
    cropCanvas.width * resizeScale,
    cropCanvas.height * resizeScale,
  )
  context.restore()

  drawVignette(context, canvas.width, canvas.height, state.filters.vignette)
  drawBlurAreas(canvas, context, state, resizeScale)
  drawTextLayers(context, canvas.width, canvas.height, state)
  drawStickerLayers(context, canvas.width, canvas.height, state)
  drawWatermark(context, canvas.width, canvas.height, state)

  return canvas
}
