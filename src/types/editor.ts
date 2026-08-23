export type ToolId =
  | 'compress'
  | 'crop'
  | 'rotate'
  | 'convert'
  | 'text'
  | 'stickers'
  | 'filters'
  | 'remove-background'
  | 'blur'
  | 'resize'
  | 'background'
  | 'watermark'

export type ImageFormat = 'jpeg' | 'png' | 'webp'

export interface CropRegion {
  x: number
  y: number
  width: number
  height: number
}

export interface FilterSettings {
  brightness: number
  contrast: number
  saturation: number
  grayscale: number
  sepia: number
  hue: number
  blur: number
  vignette: number
}

export interface TextLayer {
  id: string
  text: string
  x: number
  y: number
  size: number
  color: string
  opacity: number
  weight: number
  rotation: number
}

interface BaseStickerLayer {
  id: string
  x: number
  y: number
  size: number
  opacity: number
  rotation: number
}

export interface EmojiStickerLayer extends BaseStickerLayer {
  kind: 'emoji'
  symbol: string
}

export interface ImageStickerLayer extends BaseStickerLayer {
  kind: 'image'
  name: string
  image: HTMLImageElement
  aspectRatio: number
}

export type StickerLayer = EmojiStickerLayer | ImageStickerLayer

export type BlurShape = 'rectangle' | 'rounded' | 'ellipse'

export interface BlurArea {
  id: string
  x: number
  y: number
  width: number
  height: number
  amount: number
  shape: BlurShape
}

export interface WatermarkSettings {
  enabled: boolean
  text: string
  color: string
  opacity: number
  size: number
  position: WatermarkPosition
  tiled: boolean
}

export type WatermarkPosition =
  | 'top-left'
  | 'top-right'
  | 'center'
  | 'bottom-left'
  | 'bottom-right'

export interface EditorState {
  crop: CropRegion
  rotation: number
  flipX: boolean
  flipY: boolean
  filters: FilterSettings
  removeBackground: boolean
  backgroundTolerance: number
  backgroundFeather: number
  backgroundEnabled: boolean
  backgroundColor: string
  resizeScale: number
  textLayers: TextLayer[]
  stickerLayers: StickerLayer[]
  blurAreas: BlurArea[]
  watermark: WatermarkSettings
}

export interface LoadedImage {
  element: HTMLImageElement
  name: string
  size: number
  width: number
  height: number
  objectUrl: string
}

export interface ExportSettings {
  format: ImageFormat
  mode: 'quality' | 'target'
  quality: number
  targetMegabytes: number
}

export const DEFAULT_FILTERS: FilterSettings = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  grayscale: 0,
  sepia: 0,
  hue: 0,
  blur: 0,
  vignette: 0,
}

export const createInitialEditorState = (): EditorState => ({
  crop: {
    x: 0,
    y: 0,
    width: 1,
    height: 1,
  },
  rotation: 0,
  flipX: false,
  flipY: false,
  filters: { ...DEFAULT_FILTERS },
  removeBackground: false,
  backgroundTolerance: 36,
  backgroundFeather: 18,
  backgroundEnabled: false,
  backgroundColor: '#ffffff',
  resizeScale: 1,
  textLayers: [],
  stickerLayers: [],
  blurAreas: [],
  watermark: {
    enabled: false,
    text: 'img tools',
    color: '#ffffff',
    opacity: 45,
    size: 4,
    position: 'bottom-right',
    tiled: false,
  },
})
