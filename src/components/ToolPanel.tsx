import {
  lazy,
  Suspense,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'
import {
  ArrowDownToLine,
  Check,
  FlipHorizontal2,
  FlipVertical2,
  ImagePlus,
  Plus,
  RotateCcw,
  RotateCw,
  Trash2,
} from 'lucide-react'
import { TOOLS } from '../constants/tools'
import { loadStickerImageFile } from '../lib/files'
import {
  centerCropForAspect,
  clamp,
  constrainCrop,
  getBaseOutputSize,
  getOutputSize,
} from '../lib/imageMath'
import {
  DEFAULT_FILTERS,
  type BlurShape,
  type EditorState,
  type ExportSettings,
  type FilterSettings,
  type ImageFormat,
  type LoadedImage,
  type StickerLayer,
  type TextLayer,
  type ToolId,
  type WatermarkPosition,
} from '../types/editor'

type EditorUpdater = (
  updater: EditorState | ((current: EditorState) => EditorState),
) => void

interface ToolPanelProps {
  activeTool: ToolId
  state: EditorState
  source: LoadedImage
  onChange: EditorUpdater
  exportSettings: ExportSettings
  onExportSettingsChange: (
    updater: ExportSettings | ((current: ExportSettings) => ExportSettings),
  ) => void
  onOpenExport: () => void
  selectedTextId: string | null
  onSelectedTextIdChange: (id: string | null) => void
  selectedStickerId: string | null
  onSelectedStickerIdChange: (id: string | null) => void
  selectedBlurId: string | null
  onSelectedBlurIdChange: (id: string | null) => void
}

interface RangeFieldProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  suffix?: string
  onChange: (value: number) => void
}

function RangeField({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = '',
  onChange,
}: RangeFieldProps) {
  return (
    <label className="range-field">
      <span className="range-field__label">
        {label}
        <output>
          {Number.isInteger(value) ? value : value.toFixed(1)}
          {suffix}
        </output>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}

interface ToggleProps {
  checked: boolean
  label: string
  description?: string
  onChange: (checked: boolean) => void
}

function Toggle({ checked, label, description, onChange }: ToggleProps) {
  return (
    <label className="toggle-row">
      <span>
        <strong>{label}</strong>
        {description ? <small>{description}</small> : null}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <i aria-hidden="true" />
    </label>
  )
}

const updateFilter = (
  onChange: EditorUpdater,
  key: keyof FilterSettings,
  value: number,
) => {
  onChange((current) => ({
    ...current,
    filters: {
      ...current.filters,
      [key]: value,
    },
  }))
}

const filterPresets: Array<{
  label: string
  filters: FilterSettings
}> = [
  { label: 'Clean', filters: { ...DEFAULT_FILTERS } },
  {
    label: 'Punch',
    filters: {
      ...DEFAULT_FILTERS,
      contrast: 112,
      saturation: 128,
      brightness: 103,
    },
  },
  {
    label: 'Mono',
    filters: {
      ...DEFAULT_FILTERS,
      grayscale: 100,
      contrast: 112,
      vignette: 18,
    },
  },
  {
    label: 'Film',
    filters: {
      ...DEFAULT_FILTERS,
      sepia: 22,
      saturation: 86,
      contrast: 108,
      brightness: 104,
      vignette: 24,
    },
  },
]

const createId = () => crypto.randomUUID()
const EmojiStickerPicker = lazy(() =>
  import('./EmojiStickerPicker').then((module) => ({
    default: module.EmojiStickerPicker,
  })),
)

const blurShapeLabels: Record<BlurShape, string> = {
  rectangle: 'Rectangle',
  rounded: 'Rounded',
  ellipse: 'Circle / oval',
}

function PanelHeading({ activeTool }: { activeTool: ToolId }) {
  const tool = TOOLS.find(({ id }) => id === activeTool) ?? TOOLS[0]
  if (!tool) {
    return null
  }
  const Icon = tool.icon
  return (
    <div className="panel-heading">
      <span aria-hidden="true">
        <Icon />
      </span>
      <div>
        <h2>{tool.label}</h2>
        <p>{tool.description}</p>
      </div>
    </div>
  )
}

function ExportAction({ onOpenExport }: { onOpenExport: () => void }) {
  return (
    <button
      className="button button--primary button--wide"
      type="button"
      onClick={onOpenExport}
    >
      Review and download
      <ArrowDownToLine aria-hidden="true" />
    </button>
  )
}

export function ToolPanel({
  activeTool,
  state,
  source,
  onChange,
  exportSettings,
  onExportSettingsChange,
  onOpenExport,
  selectedTextId,
  onSelectedTextIdChange,
  selectedStickerId,
  onSelectedStickerIdChange,
  selectedBlurId,
  onSelectedBlurIdChange,
}: ToolPanelProps) {
  const stickerInputRef = useRef<HTMLInputElement>(null)
  const [stickerSource, setStickerSource] = useState<'emoji' | 'image'>('emoji')
  const [stickerLoading, setStickerLoading] = useState(false)
  const [stickerError, setStickerError] = useState<string | null>(null)
  const baseSize = getBaseOutputSize(
    source.width,
    source.height,
    state.crop,
    state.rotation,
  )
  const outputSize = getOutputSize(
    source.width,
    source.height,
    state.crop,
    state.rotation,
    state.resizeScale,
  )
  const selectedText =
    state.textLayers.find(({ id }) => id === selectedTextId) ?? null
  const selectedSticker =
    state.stickerLayers.find(({ id }) => id === selectedStickerId) ?? null
  const selectedBlur =
    state.blurAreas.find(({ id }) => id === selectedBlurId) ?? null

  const setCropValue = (
    key: 'x' | 'y' | 'width' | 'height',
    percentage: number,
  ) => {
    onChange((current) => ({
      ...current,
      crop: constrainCrop({
        ...current.crop,
        [key]: percentage / 100,
      }),
    }))
  }

  const updateText = (patch: Partial<TextLayer>) => {
    if (!selectedTextId) {
      return
    }
    onChange((current) => ({
      ...current,
      textLayers: current.textLayers.map((layer) =>
        layer.id === selectedTextId ? { ...layer, ...patch } : layer,
      ),
    }))
  }

  const updateSticker = (
    patch: Partial<
      Pick<StickerLayer, 'x' | 'y' | 'size' | 'opacity' | 'rotation'>
    >,
  ) => {
    if (!selectedStickerId) {
      return
    }
    onChange((current) => ({
      ...current,
      stickerLayers: current.stickerLayers.map((layer) =>
        layer.id === selectedStickerId ? { ...layer, ...patch } : layer,
      ),
    }))
  }

  const addEmojiSticker = (symbol: string) => {
    const id = createId()
    onChange((current) => ({
      ...current,
      stickerLayers: [
        ...current.stickerLayers,
        {
          id,
          kind: 'emoji',
          symbol,
          x: 0.5,
          y: 0.5,
          size: 12,
          opacity: 100,
          rotation: 0,
        },
      ],
    }))
    onSelectedStickerIdChange(id)
  }

  const handleStickerFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setStickerLoading(true)
    setStickerError(null)
    try {
      const image = await loadStickerImageFile(file)
      const id = createId()
      onChange((current) => ({
        ...current,
        stickerLayers: [
          ...current.stickerLayers,
          {
            id,
            kind: 'image',
            name: image.name,
            image: image.element,
            aspectRatio: image.width / image.height,
            x: 0.5,
            y: 0.5,
            size: 20,
            opacity: 100,
            rotation: 0,
          },
        ],
      }))
      onSelectedStickerIdChange(id)
    } catch (error) {
      setStickerError(
        error instanceof Error
          ? error.message
          : 'The custom sticker could not be added.',
      )
    } finally {
      setStickerLoading(false)
      event.target.value = ''
    }
  }

  const addBlurArea = (shape: BlurShape) => {
    const id = createId()
    const width = shape === 'ellipse' ? 0.24 : 0.3
    const height =
      shape === 'ellipse'
        ? clamp(width * (baseSize.width / baseSize.height), 0.12, 0.5)
        : 0.22

    onChange((current) => ({
      ...current,
      blurAreas: [
        ...current.blurAreas,
        {
          id,
          x: (1 - width) / 2,
          y: (1 - height) / 2,
          width,
          height,
          amount: 18,
          shape,
        },
      ],
    }))
    onSelectedBlurIdChange(id)
  }

  return (
    <aside className="tool-panel" aria-label={`${activeTool} controls`}>
      <PanelHeading activeTool={activeTool} />

      <div className="tool-panel__body">
        {activeTool === 'compress' ? (
          <>
            <div className="segmented" aria-label="Compression mode">
              {(['quality', 'target'] as const).map((mode) => (
                <button
                  type="button"
                  className={exportSettings.mode === mode ? 'is-active' : ''}
                  onClick={() =>
                    onExportSettingsChange((current) => ({ ...current, mode }))
                  }
                  key={mode}
                >
                  {mode === 'quality' ? 'Quality' : 'Max size'}
                </button>
              ))}
            </div>
            {exportSettings.mode === 'quality' ? (
              <RangeField
                label="Image quality"
                value={exportSettings.quality}
                min={4}
                max={100}
                suffix="%"
                onChange={(quality) =>
                  onExportSettingsChange((current) => ({
                    ...current,
                    quality,
                  }))
                }
              />
            ) : (
              <label className="field">
                <span>Maximum file size</span>
                <div className="field__with-unit">
                  <input
                    type="number"
                    min="0.01"
                    max="100"
                    step="0.1"
                    value={exportSettings.targetMegabytes}
                    onChange={(event) =>
                      onExportSettingsChange((current) => ({
                        ...current,
                        targetMegabytes: clamp(
                          Number(event.target.value),
                          0.01,
                          100,
                        ),
                      }))
                    }
                  />
                  <b>MB</b>
                </div>
              </label>
            )}
            <div className="info-card">
              <strong>Automatic tuning</strong>
              <p>
                Max-size mode searches for the best quality, then gently reduces
                dimensions only when encoding alone is not enough.
              </p>
            </div>
            <ExportAction onOpenExport={onOpenExport} />
          </>
        ) : null}

        {activeTool === 'crop' ? (
          <>
            <div className="control-section">
              <span className="control-label">Aspect ratio</span>
              <div className="preset-grid">
                {[
                  ['Free', null],
                  ['1:1', 1],
                  ['4:3', 4 / 3],
                  ['16:9', 16 / 9],
                ].map(([label, aspect]) => (
                  <button
                    type="button"
                    key={String(label)}
                    onClick={() =>
                      onChange((current) => ({
                        ...current,
                        crop:
                          typeof aspect === 'number'
                            ? centerCropForAspect(
                                { x: 0, y: 0, width: 1, height: 1 },
                                aspect,
                                source.width / source.height,
                              )
                            : { x: 0, y: 0, width: 1, height: 1 },
                      }))
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <RangeField
              label="Left edge"
              value={state.crop.x * 100}
              min={0}
              max={95}
              step={0.5}
              suffix="%"
              onChange={(value) => setCropValue('x', value)}
            />
            <RangeField
              label="Top edge"
              value={state.crop.y * 100}
              min={0}
              max={95}
              step={0.5}
              suffix="%"
              onChange={(value) => setCropValue('y', value)}
            />
            <RangeField
              label="Width"
              value={state.crop.width * 100}
              min={5}
              max={100}
              step={0.5}
              suffix="%"
              onChange={(value) => setCropValue('width', value)}
            />
            <RangeField
              label="Height"
              value={state.crop.height * 100}
              min={5}
              max={100}
              step={0.5}
              suffix="%"
              onChange={(value) => setCropValue('height', value)}
            />
            <div className="dimension-readout">
              <span>Crop output</span>
              <strong>
                {baseSize.width} × {baseSize.height}
              </strong>
            </div>
          </>
        ) : null}

        {activeTool === 'rotate' ? (
          <>
            <div className="action-grid">
              <button
                type="button"
                onClick={() =>
                  onChange((current) => ({
                    ...current,
                    rotation: current.rotation - 90,
                  }))
                }
              >
                <RotateCcw aria-hidden="true" />
                Left 90°
              </button>
              <button
                type="button"
                onClick={() =>
                  onChange((current) => ({
                    ...current,
                    rotation: current.rotation + 90,
                  }))
                }
              >
                <RotateCw aria-hidden="true" />
                Right 90°
              </button>
              <button
                type="button"
                className={state.flipX ? 'is-active' : ''}
                onClick={() =>
                  onChange((current) => ({
                    ...current,
                    flipX: !current.flipX,
                  }))
                }
              >
                <FlipHorizontal2 aria-hidden="true" />
                Mirror X
              </button>
              <button
                type="button"
                className={state.flipY ? 'is-active' : ''}
                onClick={() =>
                  onChange((current) => ({
                    ...current,
                    flipY: !current.flipY,
                  }))
                }
              >
                <FlipVertical2 aria-hidden="true" />
                Mirror Y
              </button>
            </div>
            <div className="dimension-readout">
              <span>Current turn</span>
              <strong>{((state.rotation % 360) + 360) % 360}°</strong>
            </div>
          </>
        ) : null}

        {activeTool === 'convert' ? (
          <>
            <div className="format-options" role="radiogroup" aria-label="Export format">
              {(['jpeg', 'png', 'webp'] as ImageFormat[]).map((format) => (
                <button
                  type="button"
                  role="radio"
                  aria-checked={exportSettings.format === format}
                  className={exportSettings.format === format ? 'is-active' : ''}
                  key={format}
                  onClick={() =>
                    onExportSettingsChange((current) => ({
                      ...current,
                      format,
                    }))
                  }
                >
                  <span>.{format === 'jpeg' ? 'jpg' : format}</span>
                  <small>
                    {format === 'jpeg'
                      ? 'Small photos'
                      : format === 'png'
                        ? 'Transparency'
                        : 'Best balance'}
                  </small>
                  {exportSettings.format === format ? (
                    <Check aria-hidden="true" />
                  ) : null}
                </button>
              ))}
            </div>
            <div className="info-card">
              <strong>
                {exportSettings.format === 'jpeg'
                  ? 'JPEG fills transparency with white.'
                  : exportSettings.format === 'png'
                    ? 'PNG keeps transparent pixels.'
                    : 'WebP supports transparency and compact files.'}
              </strong>
            </div>
            <ExportAction onOpenExport={onOpenExport} />
          </>
        ) : null}

        {activeTool === 'text' ? (
          <>
            <button
              className="button button--secondary button--wide"
              type="button"
              onClick={() => {
                const id = createId()
                onChange((current) => ({
                  ...current,
                  textLayers: [
                    ...current.textLayers,
                    {
                      id,
                      text: 'Your text',
                      x: 0.5,
                      y: 0.5,
                      size: 8,
                      color: '#ffffff',
                      opacity: 100,
                      weight: 700,
                      rotation: 0,
                    },
                  ],
                }))
                onSelectedTextIdChange(id)
              }}
            >
              <Plus aria-hidden="true" />
              Add text layer
            </button>
            <LayerList
              items={state.textLayers.map(({ id, text }) => ({
                id,
                label: text || 'Untitled text',
              }))}
              selectedId={selectedTextId}
              onSelect={onSelectedTextIdChange}
              onRemove={(id) => {
                onChange((current) => ({
                  ...current,
                  textLayers: current.textLayers.filter((layer) => layer.id !== id),
                }))
                if (selectedTextId === id) {
                  onSelectedTextIdChange(null)
                }
              }}
            />
            {selectedText ? (
              <div className="layer-controls">
                <label className="field">
                  <span>Text</span>
                  <input
                    type="text"
                    value={selectedText.text}
                    maxLength={120}
                    onChange={(event) => updateText({ text: event.target.value })}
                  />
                </label>
                <div className="inline-fields">
                  <label className="field field--color">
                    <span>Color</span>
                    <input
                      type="color"
                      value={selectedText.color}
                      onChange={(event) => updateText({ color: event.target.value })}
                    />
                  </label>
                  <label className="field">
                    <span>Weight</span>
                    <select
                      value={selectedText.weight}
                      onChange={(event) =>
                        updateText({ weight: Number(event.target.value) })
                      }
                    >
                      <option value="400">Regular</option>
                      <option value="600">Semibold</option>
                      <option value="700">Bold</option>
                      <option value="800">Heavy</option>
                    </select>
                  </label>
                </div>
                <RangeField
                  label="Size"
                  value={selectedText.size}
                  min={2}
                  max={24}
                  suffix="%"
                  onChange={(size) => updateText({ size })}
                />
                <RangeField
                  label="Opacity"
                  value={selectedText.opacity}
                  min={5}
                  max={100}
                  suffix="%"
                  onChange={(opacity) => updateText({ opacity })}
                />
                <RangeField
                  label="Horizontal"
                  value={selectedText.x * 100}
                  min={0}
                  max={100}
                  suffix="%"
                  onChange={(x) => updateText({ x: x / 100 })}
                />
                <RangeField
                  label="Vertical"
                  value={selectedText.y * 100}
                  min={0}
                  max={100}
                  suffix="%"
                  onChange={(y) => updateText({ y: y / 100 })}
                />
                <RangeField
                  label="Rotation"
                  value={selectedText.rotation}
                  min={-180}
                  max={180}
                  suffix="°"
                  onChange={(rotation) => updateText({ rotation })}
                />
              </div>
            ) : (
              <EmptyLayer message="Add a text layer to begin." />
            )}
          </>
        ) : null}

        {activeTool === 'stickers' ? (
          <>
            <div className="segmented" aria-label="Sticker source">
              {(['emoji', 'image'] as const).map((sourceType) => (
                <button
                  type="button"
                  className={stickerSource === sourceType ? 'is-active' : ''}
                  key={sourceType}
                  onClick={() => {
                    setStickerSource(sourceType)
                    setStickerError(null)
                  }}
                >
                  {sourceType === 'emoji' ? 'Emoji pack' : 'Custom image'}
                </button>
              ))}
            </div>

            {stickerSource === 'emoji' ? (
              <div className="emoji-picker-shell">
                <Suspense
                  fallback={
                    <div className="emoji-picker-loading" role="status">
                      Loading emoji pack…
                    </div>
                  }
                >
                  <EmojiStickerPicker onSelect={addEmojiSticker} />
                </Suspense>
              </div>
            ) : (
              <div className="custom-sticker-upload">
                <span className="custom-sticker-upload__icon" aria-hidden="true">
                  <ImagePlus />
                </span>
                <strong>Use your own sticker</strong>
                <p>Choose a JPG, PNG, WebP, AVIF, or GIF up to 20 MB.</p>
                <input
                  ref={stickerInputRef}
                  className="sr-only"
                  type="file"
                  accept="image/avif,image/gif,image/jpeg,image/png,image/webp"
                  onChange={handleStickerFile}
                />
                <button
                  className="button button--secondary"
                  type="button"
                  disabled={stickerLoading}
                  onClick={() => stickerInputRef.current?.click()}
                >
                  <ImagePlus aria-hidden="true" />
                  {stickerLoading ? 'Adding image…' : 'Choose image'}
                </button>
              </div>
            )}
            {stickerError ? (
              <p className="field-error" role="alert">
                {stickerError}
              </p>
            ) : null}
            <LayerList
              items={state.stickerLayers.map((layer) => ({
                id: layer.id,
                label:
                  layer.kind === 'emoji'
                    ? `${layer.symbol} emoji`
                    : layer.name,
              }))}
              selectedId={selectedStickerId}
              onSelect={onSelectedStickerIdChange}
              onRemove={(id) => {
                onChange((current) => ({
                  ...current,
                  stickerLayers: current.stickerLayers.filter(
                    (layer) => layer.id !== id,
                  ),
                }))
                if (selectedStickerId === id) {
                  onSelectedStickerIdChange(null)
                }
              }}
            />
            {selectedSticker ? (
              <div className="layer-controls">
                <RangeField
                  label="Size"
                  value={selectedSticker.size}
                  min={3}
                  max={60}
                  suffix="%"
                  onChange={(size) => updateSticker({ size })}
                />
                <RangeField
                  label="Opacity"
                  value={selectedSticker.opacity}
                  min={5}
                  max={100}
                  suffix="%"
                  onChange={(opacity) => updateSticker({ opacity })}
                />
                <RangeField
                  label="Horizontal"
                  value={selectedSticker.x * 100}
                  min={0}
                  max={100}
                  suffix="%"
                  onChange={(x) => updateSticker({ x: x / 100 })}
                />
                <RangeField
                  label="Vertical"
                  value={selectedSticker.y * 100}
                  min={0}
                  max={100}
                  suffix="%"
                  onChange={(y) => updateSticker({ y: y / 100 })}
                />
                <RangeField
                  label="Rotation"
                  value={selectedSticker.rotation}
                  min={-180}
                  max={180}
                  suffix="°"
                  onChange={(rotation) => updateSticker({ rotation })}
                />
              </div>
            ) : (
              <EmptyLayer message="Pick an emoji or add an image, then drag and resize it on the photo." />
            )}
          </>
        ) : null}

        {activeTool === 'filters' ? (
          <>
            <div className="control-section">
              <span className="control-label">Starting looks</span>
              <div className="preset-grid">
                {filterPresets.map((preset) => (
                  <button
                    type="button"
                    key={preset.label}
                    onClick={() =>
                      onChange((current) => ({
                        ...current,
                        filters: { ...preset.filters },
                      }))
                    }
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <RangeField
              label="Brightness"
              value={state.filters.brightness}
              min={0}
              max={200}
              suffix="%"
              onChange={(value) => updateFilter(onChange, 'brightness', value)}
            />
            <RangeField
              label="Contrast"
              value={state.filters.contrast}
              min={0}
              max={200}
              suffix="%"
              onChange={(value) => updateFilter(onChange, 'contrast', value)}
            />
            <RangeField
              label="Saturation"
              value={state.filters.saturation}
              min={0}
              max={200}
              suffix="%"
              onChange={(value) => updateFilter(onChange, 'saturation', value)}
            />
            <RangeField
              label="Grayscale"
              value={state.filters.grayscale}
              min={0}
              max={100}
              suffix="%"
              onChange={(value) => updateFilter(onChange, 'grayscale', value)}
            />
            <RangeField
              label="Sepia"
              value={state.filters.sepia}
              min={0}
              max={100}
              suffix="%"
              onChange={(value) => updateFilter(onChange, 'sepia', value)}
            />
            <RangeField
              label="Hue"
              value={state.filters.hue}
              min={-180}
              max={180}
              suffix="°"
              onChange={(value) => updateFilter(onChange, 'hue', value)}
            />
            <RangeField
              label="Soft blur"
              value={state.filters.blur}
              min={0}
              max={20}
              suffix="px"
              onChange={(value) => updateFilter(onChange, 'blur', value)}
            />
            <RangeField
              label="Vignette"
              value={state.filters.vignette}
              min={0}
              max={80}
              suffix="%"
              onChange={(value) => updateFilter(onChange, 'vignette', value)}
            />
          </>
        ) : null}

        {activeTool === 'remove-background' ? (
          <>
            <Toggle
              checked={state.removeBackground}
              label="Remove connected background"
              description="Best for flat or gently shaded backgrounds touching the image edge."
              onChange={(removeBackground) =>
                onChange((current) => ({ ...current, removeBackground }))
              }
            />
            <RangeField
              label="Color tolerance"
              value={state.backgroundTolerance}
              min={4}
              max={120}
              onChange={(backgroundTolerance) =>
                onChange((current) => ({ ...current, backgroundTolerance }))
              }
            />
            <RangeField
              label="Edge feather"
              value={state.backgroundFeather}
              min={1}
              max={64}
              suffix="px"
              onChange={(backgroundFeather) =>
                onChange((current) => ({ ...current, backgroundFeather }))
              }
            />
            <div className="info-card">
              <strong>Local edge-aware removal</strong>
              <p>
                The tool samples the corners and clears matching pixels connected
                to the frame. Detailed or disconnected backgrounds stay intact.
              </p>
            </div>
          </>
        ) : null}

        {activeTool === 'blur' ? (
          <>
            <div className="control-section">
              <span className="control-label">Add a mask</span>
              <div className="shape-picker">
                {(Object.keys(blurShapeLabels) as BlurShape[]).map((shape) => (
                  <button
                    type="button"
                    key={shape}
                    onClick={() => addBlurArea(shape)}
                  >
                    <i className={`shape-swatch shape-swatch--${shape}`} />
                    {blurShapeLabels[shape]}
                  </button>
                ))}
              </div>
            </div>
            <LayerList
              items={state.blurAreas.map(({ id, shape }, index) => ({
                id,
                label: `${blurShapeLabels[shape]} ${index + 1}`,
              }))}
              selectedId={selectedBlurId}
              onSelect={onSelectedBlurIdChange}
              onRemove={(id) => {
                onChange((current) => ({
                  ...current,
                  blurAreas: current.blurAreas.filter((area) => area.id !== id),
                }))
                if (selectedBlurId === id) {
                  onSelectedBlurIdChange(null)
                }
              }}
            />
            {selectedBlur ? (
              <div className="layer-controls">
                <div className="control-section">
                  <span className="control-label">Mask shape</span>
                  <div className="preset-grid preset-grid--three">
                    {(Object.keys(blurShapeLabels) as BlurShape[]).map((shape) => (
                      <button
                        type="button"
                        className={selectedBlur.shape === shape ? 'is-active' : ''}
                        key={shape}
                        onClick={() =>
                          onChange((current) => ({
                            ...current,
                            blurAreas: current.blurAreas.map((area) =>
                              area.id === selectedBlur.id
                                ? { ...area, shape }
                                : area,
                            ),
                          }))
                        }
                      >
                        {blurShapeLabels[shape]}
                      </button>
                    ))}
                  </div>
                </div>
                <RangeField
                  label="Blur strength"
                  value={selectedBlur.amount}
                  min={2}
                  max={48}
                  suffix="px"
                  onChange={(amount) =>
                    onChange((current) => ({
                      ...current,
                      blurAreas: current.blurAreas.map((area) =>
                        area.id === selectedBlur.id ? { ...area, amount } : area,
                      ),
                    }))
                  }
                />
                {(['x', 'y', 'width', 'height'] as const).map((key) => (
                  <RangeField
                    key={key}
                    label={
                      key === 'x'
                        ? 'Horizontal'
                        : key === 'y'
                          ? 'Vertical'
                          : key[0]?.toUpperCase() + key.slice(1)
                    }
                    value={selectedBlur[key] * 100}
                    min={key === 'width' || key === 'height' ? 5 : 0}
                    max={
                      key === 'x'
                        ? (1 - selectedBlur.width) * 100
                        : key === 'y'
                          ? (1 - selectedBlur.height) * 100
                          : key === 'width'
                            ? (1 - selectedBlur.x) * 100
                            : (1 - selectedBlur.y) * 100
                    }
                    suffix="%"
                    onChange={(value) =>
                      onChange((current) => ({
                        ...current,
                        blurAreas: current.blurAreas.map((area) =>
                          area.id === selectedBlur.id
                            ? { ...area, [key]: value / 100 }
                            : area,
                        ),
                      }))
                    }
                  />
                ))}
              </div>
            ) : (
              <EmptyLayer message="Add a mask, then drag or resize its outline directly on the image." />
            )}
          </>
        ) : null}

        {activeTool === 'resize' ? (
          <>
            <RangeField
              label="Scale"
              value={state.resizeScale * 100}
              min={10}
              max={400}
              step={5}
              suffix="%"
              onChange={(value) =>
                onChange((current) => ({
                  ...current,
                  resizeScale: value / 100,
                }))
              }
            />
            <div className="inline-fields">
              <label className="field">
                <span>Width</span>
                <input
                  type="number"
                  min="1"
                  max={baseSize.width * 4}
                  value={outputSize.width}
                  onChange={(event) =>
                    onChange((current) => ({
                      ...current,
                      resizeScale: clamp(
                        Number(event.target.value) / baseSize.width,
                        0.1,
                        4,
                      ),
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>Height</span>
                <input
                  type="number"
                  min="1"
                  max={baseSize.height * 4}
                  value={outputSize.height}
                  onChange={(event) =>
                    onChange((current) => ({
                      ...current,
                      resizeScale: clamp(
                        Number(event.target.value) / baseSize.height,
                        0.1,
                        4,
                      ),
                    }))
                  }
                />
              </label>
            </div>
            <div className="preset-grid">
              {[0.5, 1, 2, 4].map((scale) => (
                <button
                  type="button"
                  className={state.resizeScale === scale ? 'is-active' : ''}
                  key={scale}
                  onClick={() =>
                    onChange((current) => ({
                      ...current,
                      resizeScale: scale,
                    }))
                  }
                >
                  {scale}×
                </button>
              ))}
            </div>
            <div className="dimension-readout">
              <span>Export dimensions</span>
              <strong>
                {outputSize.width} × {outputSize.height}
              </strong>
            </div>
            {state.resizeScale > 1 ? (
              <div className="info-card">
                <strong>High-quality resampling</strong>
                <p>
                  Upscaling adds pixels with browser high-quality smoothing. It
                  does not invent detail like a generative model.
                </p>
              </div>
            ) : null}
          </>
        ) : null}

        {activeTool === 'background' ? (
          <>
            <Toggle
              checked={state.backgroundEnabled}
              label="Solid background"
              description="Visible through transparent or removed areas."
              onChange={(backgroundEnabled) =>
                onChange((current) => ({ ...current, backgroundEnabled }))
              }
            />
            <label className="color-field">
              <span>Background color</span>
              <div>
                <input
                  type="color"
                  value={state.backgroundColor}
                  onChange={(event) =>
                    onChange((current) => ({
                      ...current,
                      backgroundColor: event.target.value,
                    }))
                  }
                />
                <code>{state.backgroundColor.toUpperCase()}</code>
              </div>
            </label>
            <div className="swatch-grid" aria-label="Background color presets">
              {['#FFFFFF', '#151329', '#F2D85F', '#FF716B', '#39C3B8', '#7566EC'].map(
                (color) => (
                  <button
                    type="button"
                    key={color}
                    style={{ backgroundColor: color }}
                    aria-label={`Use ${color} background`}
                    onClick={() =>
                      onChange((current) => ({
                        ...current,
                        backgroundEnabled: true,
                        backgroundColor: color,
                      }))
                    }
                  />
                ),
              )}
            </div>
          </>
        ) : null}

        {activeTool === 'watermark' ? (
          <>
            <Toggle
              checked={state.watermark.enabled}
              label="Show watermark"
              onChange={(enabled) =>
                onChange((current) => ({
                  ...current,
                  watermark: { ...current.watermark, enabled },
                }))
              }
            />
            <label className="field">
              <span>Watermark text</span>
              <input
                type="text"
                maxLength={100}
                value={state.watermark.text}
                onChange={(event) =>
                  onChange((current) => ({
                    ...current,
                    watermark: {
                      ...current.watermark,
                      text: event.target.value,
                    },
                  }))
                }
              />
            </label>
            <label className="color-field">
              <span>Watermark color</span>
              <div>
                <input
                  type="color"
                  value={state.watermark.color}
                  onChange={(event) =>
                    onChange((current) => ({
                      ...current,
                      watermark: {
                        ...current.watermark,
                        color: event.target.value,
                      },
                    }))
                  }
                />
                <code>{state.watermark.color.toUpperCase()}</code>
              </div>
            </label>
            <RangeField
              label="Size"
              value={state.watermark.size}
              min={1}
              max={16}
              suffix="%"
              onChange={(size) =>
                onChange((current) => ({
                  ...current,
                  watermark: { ...current.watermark, size },
                }))
              }
            />
            <RangeField
              label="Opacity"
              value={state.watermark.opacity}
              min={5}
              max={100}
              suffix="%"
              onChange={(opacity) =>
                onChange((current) => ({
                  ...current,
                  watermark: { ...current.watermark, opacity },
                }))
              }
            />
            <label className="field">
              <span>Position</span>
              <select
                value={state.watermark.position}
                disabled={state.watermark.tiled}
                onChange={(event) =>
                  onChange((current) => ({
                    ...current,
                    watermark: {
                      ...current.watermark,
                      position: event.target.value as WatermarkPosition,
                    },
                  }))
                }
              >
                <option value="top-left">Top left</option>
                <option value="top-right">Top right</option>
                <option value="center">Center</option>
                <option value="bottom-left">Bottom left</option>
                <option value="bottom-right">Bottom right</option>
              </select>
            </label>
            <Toggle
              checked={state.watermark.tiled}
              label="Repeat across image"
              onChange={(tiled) =>
                onChange((current) => ({
                  ...current,
                  watermark: { ...current.watermark, tiled },
                }))
              }
            />
          </>
        ) : null}
      </div>
    </aside>
  )
}

interface LayerListProps {
  items: Array<{ id: string; label: string }>
  selectedId: string | null
  onSelect: (id: string) => void
  onRemove: (id: string) => void
}

function LayerList({
  items,
  selectedId,
  onSelect,
  onRemove,
}: LayerListProps) {
  if (items.length === 0) {
    return null
  }

  return (
    <div className="layer-list" aria-label="Image layers">
      {items.map((item) => (
        <div
          className={`layer-list__item ${selectedId === item.id ? 'is-active' : ''}`}
          key={item.id}
        >
          <button type="button" onClick={() => onSelect(item.id)}>
            <span>{item.label}</span>
          </button>
          <button
            className="icon-button icon-button--danger"
            type="button"
            aria-label={`Remove ${item.label}`}
            onClick={() => onRemove(item.id)}
          >
            <Trash2 aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  )
}

function EmptyLayer({ message }: { message: string }) {
  return <p className="empty-layer">{message}</p>
}
