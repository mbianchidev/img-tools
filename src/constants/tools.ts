import {
  Blend,
  Crop,
  Expand,
  FileOutput,
  Gauge,
  Highlighter,
  ImageMinus,
  PaintBucket,
  RotateCw,
  SlidersHorizontal,
  SmilePlus,
  Type,
  type LucideIcon,
} from 'lucide-react'
import type { ToolId } from '../types/editor'

export interface ToolDefinition {
  id: ToolId
  label: string
  description: string
  icon: LucideIcon
}

export const TOOLS: ToolDefinition[] = [
  {
    id: 'compress',
    label: 'Compress',
    description: 'Choose a quality or hit a maximum file size.',
    icon: Gauge,
  },
  {
    id: 'crop',
    label: 'Crop',
    description: 'Drag and resize the frame or use a familiar aspect ratio.',
    icon: Crop,
  },
  {
    id: 'rotate',
    label: 'Rotate',
    description: 'Turn and mirror the image without quality loss.',
    icon: RotateCw,
  },
  {
    id: 'convert',
    label: 'Convert',
    description: 'Export to JPG, PNG, or WebP.',
    icon: FileOutput,
  },
  {
    id: 'text',
    label: 'Text',
    description: 'Place readable text anywhere on the image.',
    icon: Type,
  },
  {
    id: 'stickers',
    label: 'Stickers',
    description: 'Browse every emoji or use your own image as a sticker.',
    icon: SmilePlus,
  },
  {
    id: 'filters',
    label: 'Effects',
    description: 'Tune light and color or start from a preset.',
    icon: SlidersHorizontal,
  },
  {
    id: 'remove-background',
    label: 'Remove BG',
    description: 'Clear a connected, near-solid background locally.',
    icon: ImageMinus,
  },
  {
    id: 'blur',
    label: 'Blur area',
    description: 'Drag a rectangular, rounded, or elliptical privacy mask.',
    icon: Blend,
  },
  {
    id: 'resize',
    label: 'Resize',
    description: 'Scale down for the web or upscale up to 4x.',
    icon: Expand,
  },
  {
    id: 'background',
    label: 'Background',
    description: 'Place transparent pixels over a solid color.',
    icon: PaintBucket,
  },
  {
    id: 'watermark',
    label: 'Watermark',
    description: 'Add a corner mark or a repeated protection layer.',
    icon: Highlighter,
  },
]
