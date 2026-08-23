import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'
import { Grip, ScanLine } from 'lucide-react'
import {
  clamp,
  getLayerRenderSize,
  moveNormalizedRect,
  resizeNormalizedRect,
  type ResizeHandle,
} from '../lib/imageMath'
import { renderImage } from '../lib/imageEngine'
import {
  createInitialEditorState,
  type CropRegion,
  type EditorState,
  type LoadedImage,
  type StickerLayer,
  type ToolId,
} from '../types/editor'

type EditorUpdater = (
  updater: EditorState | ((current: EditorState) => EditorState),
) => void

interface CanvasStageProps {
  source: LoadedImage
  state: EditorState
  activeTool: ToolId
  selectedTextId: string | null
  selectedStickerId: string | null
  selectedBlurId: string | null
  onChange: EditorUpdater
  onTransientChange: EditorUpdater
  onInteractionStart: () => void
  onInteractionEnd: () => void
  onSelectedStickerIdChange: (id: string) => void
  onSelectedBlurIdChange: (id: string) => void
  onRenderingChange: (rendering: boolean) => void
  onError: (message: string | null) => void
}

type PointTarget =
  | { type: 'text'; id: string }
  | { type: 'sticker'; id: string }

type RectTarget = { type: 'crop' } | { type: 'blur'; id: string }

type Interaction =
  | {
      kind: 'move-point'
      pointerId: number
      target: PointTarget
      startPointer: { x: number; y: number }
      startPosition: { x: number; y: number }
    }
  | {
      kind: 'move-rect'
      pointerId: number
      target: RectTarget
      startPointer: { x: number; y: number }
      startRect: CropRegion
    }
  | {
      kind: 'resize-rect'
      pointerId: number
      target: RectTarget
      handle: ResizeHandle
      startPointer: { x: number; y: number }
      startRect: CropRegion
    }
  | {
      kind: 'resize-sticker'
      pointerId: number
      id: string
      center: { x: number; y: number }
      startDistance: number
      startSize: number
    }

const resizeHandles: Array<{ id: ResizeHandle; label: string }> = [
  { id: 'north-west', label: 'top left' },
  { id: 'north-east', label: 'top right' },
  { id: 'south-east', label: 'bottom right' },
  { id: 'south-west', label: 'bottom left' },
]

export function CanvasStage({
  source,
  state,
  activeTool,
  selectedTextId,
  selectedStickerId,
  selectedBlurId,
  onChange,
  onTransientChange,
  onInteractionStart,
  onInteractionEnd,
  onSelectedStickerIdChange,
  onSelectedBlurIdChange,
  onRenderingChange,
  onError,
}: CanvasStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const interactionRef = useRef<Interaction | null>(null)
  const previousActiveToolRef = useRef(activeTool)
  const [previewSize, setPreviewSize] = useState({ width: 1, height: 1 })
  const [frameSize, setFrameSize] = useState({ width: 1, height: 1 })
  const [showOriginal, setShowOriginal] = useState(false)
  const originalState = useMemo(() => createInitialEditorState(), [])
  const cropPreviewState = useMemo(
    () => ({
      ...createInitialEditorState(),
      filters: state.filters,
      removeBackground: state.removeBackground,
      backgroundTolerance: state.backgroundTolerance,
      backgroundFeather: state.backgroundFeather,
      backgroundEnabled: state.backgroundEnabled,
      backgroundColor: state.backgroundColor,
    }),
    [
      state.backgroundColor,
      state.backgroundEnabled,
      state.backgroundFeather,
      state.backgroundTolerance,
      state.filters,
      state.removeBackground,
    ],
  )
  const previewState = showOriginal
    ? originalState
    : activeTool === 'crop'
      ? cropPreviewState
      : state
  const endActiveInteraction = useCallback(() => {
    if (!interactionRef.current) {
      return
    }
    interactionRef.current = null
    onInteractionEnd()
  }, [onInteractionEnd])

  useEffect(() => {
    let cancelled = false
    onRenderingChange(true)
    onError(null)

    const frame = window.requestAnimationFrame(() => {
      try {
        const rendered = renderImage(
          source,
          previewState,
          { maxDimension: 1500 },
        )
        if (cancelled || !canvasRef.current) {
          return
        }
        const canvas = canvasRef.current
        canvas.width = rendered.width
        canvas.height = rendered.height
        const context = canvas.getContext('2d')
        if (!context) {
          throw new Error('Your browser could not display the preview canvas.')
        }
        context.clearRect(0, 0, canvas.width, canvas.height)
        context.drawImage(rendered, 0, 0)
        setPreviewSize({ width: rendered.width, height: rendered.height })
      } catch (error) {
        onError(
          error instanceof Error
            ? error.message
            : 'The image preview could not be rendered.',
        )
      } finally {
        if (!cancelled) {
          onRenderingChange(false)
        }
      }
    })

    return () => {
      cancelled = true
      window.cancelAnimationFrame(frame)
    }
  }, [onError, onRenderingChange, previewState, source])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) {
      return
    }

    const updateFrameSize = (width: number, height: number) => {
      const scale = Math.min(
        width / previewSize.width,
        height / previewSize.height,
      )
      if (!Number.isFinite(scale) || scale <= 0) {
        return
      }
      setFrameSize({
        width: Math.max(1, Math.floor(previewSize.width * scale)),
        height: Math.max(1, Math.floor(previewSize.height * scale)),
      })
    }
    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        updateFrameSize(entry.contentRect.width, entry.contentRect.height)
      }
    })
    observer.observe(viewport)
    const bounds = viewport.getBoundingClientRect()
    updateFrameSize(
      Math.max(0, bounds.width - 44),
      Math.max(0, bounds.height - 44),
    )

    return () => observer.disconnect()
  }, [previewSize.height, previewSize.width])

  useEffect(() => {
    if (previousActiveToolRef.current !== activeTool) {
      endActiveInteraction()
      previousActiveToolRef.current = activeTool
    }
  }, [activeTool, endActiveInteraction])

  useEffect(() => {
    if (showOriginal) {
      endActiveInteraction()
    }
  }, [endActiveInteraction, showOriginal])

  const getPointerPosition = (clientX: number, clientY: number) => {
    const bounds = frameRef.current?.getBoundingClientRect()
    if (!bounds || bounds.width === 0 || bounds.height === 0) {
      return null
    }

    return {
      x: (clientX - bounds.left) / bounds.width,
      y: (clientY - bounds.top) / bounds.height,
    }
  }

  const updateRect = (
    current: EditorState,
    target: RectTarget,
    rect: CropRegion,
  ): EditorState => {
    if (target.type === 'crop') {
      return { ...current, crop: rect }
    }

    return {
      ...current,
      blurAreas: current.blurAreas.map((area) =>
        area.id === target.id ? { ...area, ...rect } : area,
      ),
    }
  }

  const startPointMove = (
    event: PointerEvent<HTMLButtonElement>,
    target: PointTarget,
    position: { x: number; y: number },
  ) => {
    if (interactionRef.current || !event.isPrimary) {
      return
    }
    const pointer = getPointerPosition(event.clientX, event.clientY)
    if (!pointer) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    if (target.type === 'sticker') {
      onSelectedStickerIdChange(target.id)
    }
    onInteractionStart()
    interactionRef.current = {
      kind: 'move-point',
      pointerId: event.pointerId,
      target,
      startPointer: pointer,
      startPosition: position,
    }
  }

  const startRectMove = (
    event: PointerEvent<HTMLButtonElement>,
    target: RectTarget,
    rect: CropRegion,
  ) => {
    if (interactionRef.current || !event.isPrimary) {
      return
    }
    const pointer = getPointerPosition(event.clientX, event.clientY)
    if (!pointer) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    if (target.type === 'blur') {
      onSelectedBlurIdChange(target.id)
    }
    onInteractionStart()
    interactionRef.current = {
      kind: 'move-rect',
      pointerId: event.pointerId,
      target,
      startPointer: pointer,
      startRect: rect,
    }
  }

  const startRectResize = (
    event: PointerEvent<HTMLButtonElement>,
    target: RectTarget,
    rect: CropRegion,
    handle: ResizeHandle,
  ) => {
    if (interactionRef.current || !event.isPrimary) {
      return
    }
    const pointer = getPointerPosition(event.clientX, event.clientY)
    if (!pointer) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    if (target.type === 'blur') {
      onSelectedBlurIdChange(target.id)
    }
    onInteractionStart()
    interactionRef.current = {
      kind: 'resize-rect',
      pointerId: event.pointerId,
      target,
      handle,
      startPointer: pointer,
      startRect: rect,
    }
  }

  const startStickerResize = (
    event: PointerEvent<HTMLButtonElement>,
    layer: StickerLayer,
  ) => {
    if (interactionRef.current || !event.isPrimary) {
      return
    }
    const bounds = frameRef.current?.getBoundingClientRect()
    if (!bounds) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    onSelectedStickerIdChange(layer.id)
    onInteractionStart()
    const center = {
      x: bounds.left + layer.x * bounds.width,
      y: bounds.top + layer.y * bounds.height,
    }
    interactionRef.current = {
      kind: 'resize-sticker',
      pointerId: event.pointerId,
      id: layer.id,
      center,
      startDistance: Math.max(
        1,
        Math.hypot(event.clientX - center.x, event.clientY - center.y),
      ),
      startSize: layer.size,
    }
  }

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    const interaction = interactionRef.current
    if (!interaction || interaction.pointerId !== event.pointerId) {
      return
    }

    if (interaction.kind === 'resize-sticker') {
      const distance = Math.hypot(
        event.clientX - interaction.center.x,
        event.clientY - interaction.center.y,
      )
      const size = clamp(
        interaction.startSize * (distance / interaction.startDistance),
        3,
        60,
      )
      onTransientChange((current) => ({
        ...current,
        stickerLayers: current.stickerLayers.map((layer) =>
          layer.id === interaction.id ? { ...layer, size } : layer,
        ),
      }))
      return
    }

    const pointer = getPointerPosition(event.clientX, event.clientY)
    if (!pointer) {
      return
    }
    const deltaX = pointer.x - interaction.startPointer.x
    const deltaY = pointer.y - interaction.startPointer.y

    if (interaction.kind === 'move-point') {
      const x = clamp(interaction.startPosition.x + deltaX, 0, 1)
      const y = clamp(interaction.startPosition.y + deltaY, 0, 1)
      onTransientChange((current) =>
        interaction.target.type === 'text'
          ? {
              ...current,
              textLayers: current.textLayers.map((layer) =>
                layer.id === interaction.target.id ? { ...layer, x, y } : layer,
              ),
            }
          : {
              ...current,
              stickerLayers: current.stickerLayers.map((layer) =>
                layer.id === interaction.target.id ? { ...layer, x, y } : layer,
              ),
            },
      )
      return
    }

    const rect =
      interaction.kind === 'move-rect'
        ? moveNormalizedRect(interaction.startRect, deltaX, deltaY)
        : resizeNormalizedRect(
            interaction.startRect,
            interaction.handle,
            deltaX,
            deltaY,
          )
    onTransientChange((current) => updateRect(current, interaction.target, rect))
  }

  const finishInteraction = (event: PointerEvent<HTMLElement>) => {
    if (interactionRef.current?.pointerId !== event.pointerId) {
      return
    }
    endActiveInteraction()
  }

  const getKeyboardDelta = (
    event: KeyboardEvent<HTMLButtonElement>,
  ): [number, number] | null => {
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    }
    const move = moves[event.key]
    if (!move) {
      return null
    }
    event.preventDefault()
    const bounds = frameRef.current?.getBoundingClientRect()
    if (!bounds) {
      return null
    }
    const step = event.shiftKey ? 10 : 2
    return [(move[0] * step) / bounds.width, (move[1] * step) / bounds.height]
  }

  const handlePointKeyboardMove = (
    event: KeyboardEvent<HTMLButtonElement>,
    target: PointTarget,
  ) => {
    const delta = getKeyboardDelta(event)
    if (!delta) {
      return
    }
    onChange((current) => {
      if (target.type === 'text') {
        return {
          ...current,
          textLayers: current.textLayers.map((layer) =>
            layer.id === target.id
              ? {
                  ...layer,
                  x: clamp(layer.x + delta[0], 0, 1),
                  y: clamp(layer.y + delta[1], 0, 1),
                }
              : layer,
          ),
        }
      }
      return {
        ...current,
        stickerLayers: current.stickerLayers.map((layer) =>
          layer.id === target.id
            ? {
                ...layer,
                x: clamp(layer.x + delta[0], 0, 1),
                y: clamp(layer.y + delta[1], 0, 1),
              }
            : layer,
        ),
      }
    })
  }

  const handleRectKeyboard = (
    event: KeyboardEvent<HTMLButtonElement>,
    target: RectTarget,
    handle?: ResizeHandle,
  ) => {
    const delta = getKeyboardDelta(event)
    if (!delta) {
      return
    }
    onChange((current) => {
      const rect =
        target.type === 'crop'
          ? current.crop
          : current.blurAreas.find(({ id }) => id === target.id)
      if (!rect) {
        return current
      }
      const next = handle
        ? resizeNormalizedRect(rect, handle, delta[0], delta[1])
        : moveNormalizedRect(rect, delta[0], delta[1])
      return updateRect(current, target, next)
    })
  }

  const handleStickerResizeKeyboard = (
    event: KeyboardEvent<HTMLButtonElement>,
    id: string,
  ) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      return
    }
    event.preventDefault()
    const direction =
      event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1
    const step = event.shiftKey ? 4 : 1
    onChange((current) => ({
      ...current,
      stickerLayers: current.stickerLayers.map((layer) =>
        layer.id === id
          ? { ...layer, size: clamp(layer.size + direction * step, 3, 60) }
          : layer,
      ),
    }))
  }

  const selectedText = state.textLayers.find(({ id }) => id === selectedTextId)
  const getRectStyle = (rect: CropRegion): CSSProperties => ({
    left: `${rect.x * 100}%`,
    top: `${rect.y * 100}%`,
    width: `${rect.width * 100}%`,
    height: `${rect.height * 100}%`,
  })
  const getStickerStyle = (layer: StickerLayer): CSSProperties => {
    const size = getLayerRenderSize(
      previewSize.width,
      previewSize.height,
      layer.size,
      layer.kind === 'image' ? layer.aspectRatio : 1,
    )
    return {
      left: `${layer.x * 100}%`,
      top: `${layer.y * 100}%`,
      width: `${(size.width / previewSize.width) * 100}%`,
      height: `${(size.height / previewSize.height) * 100}%`,
      transform: `translate(-50%, -50%) rotate(${layer.rotation}deg)`,
    }
  }
  const interactionHint =
    activeTool === 'crop'
      ? 'Drag the frame to move it; drag a corner to resize.'
      : activeTool === 'blur'
        ? 'Drag any mask to move it; drag a corner to resize.'
        : activeTool === 'stickers'
          ? 'Drag a sticker to move it; use its corner handle to resize.'
          : 'Use the controls or drag selected layers.'
  const pointerInteractionHandlers = {
    onPointerMove: handlePointerMove,
    onPointerUp: finishInteraction,
    onPointerCancel: finishInteraction,
  }

  return (
    <section className="canvas-stage" aria-label="Image preview">
      <div className="canvas-stage__topbar">
        <div>
          <ScanLine aria-hidden="true" />
          Live preview
        </div>
        <button
          type="button"
          className="compare-button"
          onPointerDown={() => setShowOriginal(true)}
          onPointerUp={() => setShowOriginal(false)}
          onPointerCancel={() => setShowOriginal(false)}
          onKeyDown={(event) => {
            if (event.key === ' ' || event.key === 'Enter') {
              event.preventDefault()
              setShowOriginal(true)
            }
          }}
          onKeyUp={() => setShowOriginal(false)}
        >
          Hold for original
        </button>
      </div>

      <div ref={viewportRef} className="canvas-stage__viewport">
        <div
          ref={frameRef}
          className="canvas-frame"
          style={{
            width: frameSize.width,
            height: frameSize.height,
          }}
        >
          <canvas ref={canvasRef} aria-label={`Preview of ${source.name}`} />

          {!showOriginal && activeTool === 'text' && selectedText ? (
            <button
              className="layer-handle"
              type="button"
              style={{
                left: `${selectedText.x * 100}%`,
                top: `${selectedText.y * 100}%`,
              }}
              aria-label="Move selected text"
              {...pointerInteractionHandlers}
              onPointerDown={(event) =>
                startPointMove(
                  event,
                  { type: 'text', id: selectedText.id },
                  { x: selectedText.x, y: selectedText.y },
                )
              }
              onKeyDown={(event) =>
                handlePointKeyboardMove(event, {
                  type: 'text',
                  id: selectedText.id,
                })
              }
            >
              <Grip aria-hidden="true" />
            </button>
          ) : null}

          {!showOriginal && activeTool === 'crop' ? (
            <div className="transform-frame crop-frame" style={getRectStyle(state.crop)}>
              <button
                className="transform-frame__move"
                type="button"
                aria-label="Move crop frame"
                {...pointerInteractionHandlers}
                onPointerDown={(event) =>
                  startRectMove(event, { type: 'crop' }, state.crop)
                }
                onKeyDown={(event) => handleRectKeyboard(event, { type: 'crop' })}
              >
                <span className="crop-frame__grid" aria-hidden="true" />
                <span className="transform-frame__label">Crop</span>
              </button>
              {resizeHandles.map(({ id, label }) => (
                <button
                  className={`resize-handle resize-handle--${id}`}
                  type="button"
                  aria-label={`Resize crop from ${label}`}
                  key={id}
                  {...pointerInteractionHandlers}
                  onPointerDown={(event) =>
                    startRectResize(event, { type: 'crop' }, state.crop, id)
                  }
                  onKeyDown={(event) =>
                    handleRectKeyboard(event, { type: 'crop' }, id)
                  }
                />
              ))}
            </div>
          ) : null}

          {!showOriginal && activeTool === 'stickers'
            ? state.stickerLayers.map((layer) => {
                const selected = layer.id === selectedStickerId
                return (
                  <div
                    className={`sticker-transform ${selected ? 'is-selected' : ''}`}
                    style={getStickerStyle(layer)}
                    key={layer.id}
                  >
                    <button
                      className="transform-frame__move"
                      type="button"
                      aria-label={`Move ${
                        layer.kind === 'emoji' ? `${layer.symbol} emoji` : layer.name
                      } sticker`}
                      {...pointerInteractionHandlers}
                      onFocus={() => onSelectedStickerIdChange(layer.id)}
                      onPointerDown={(event) =>
                        startPointMove(
                          event,
                          { type: 'sticker', id: layer.id },
                          { x: layer.x, y: layer.y },
                        )
                      }
                      onKeyDown={(event) =>
                        handlePointKeyboardMove(event, {
                          type: 'sticker',
                          id: layer.id,
                        })
                      }
                    />
                    {selected ? (
                      <button
                        className="resize-handle resize-handle--south-east"
                        type="button"
                        aria-label="Resize selected sticker"
                        {...pointerInteractionHandlers}
                        onPointerDown={(event) => startStickerResize(event, layer)}
                        onKeyDown={(event) =>
                          handleStickerResizeKeyboard(event, layer.id)
                        }
                      />
                    ) : null}
                  </div>
                )
              })
            : null}

          {!showOriginal && activeTool === 'blur'
            ? state.blurAreas.map((area, index) => {
                const selected = area.id === selectedBlurId
                const target: RectTarget = { type: 'blur', id: area.id }
                return (
                  <div
                    className={`transform-frame blur-frame blur-frame--${area.shape} ${
                      selected ? 'is-selected' : ''
                    }`}
                    style={getRectStyle(area)}
                    key={area.id}
                  >
                    <button
                      className="transform-frame__move"
                      type="button"
                      aria-label={`Move blur mask ${index + 1}`}
                      {...pointerInteractionHandlers}
                      onFocus={() => onSelectedBlurIdChange(area.id)}
                      onPointerDown={(event) =>
                        startRectMove(event, target, area)
                      }
                      onKeyDown={(event) =>
                        handleRectKeyboard(event, target)
                      }
                    >
                      {selected ? (
                        <span className="transform-frame__label">
                          Blur {index + 1}
                        </span>
                      ) : null}
                    </button>
                    {selected
                      ? resizeHandles.map(({ id, label }) => (
                          <button
                            className={`resize-handle resize-handle--${id}`}
                            type="button"
                            aria-label={`Resize blur mask ${index + 1} from ${label}`}
                            key={id}
                            {...pointerInteractionHandlers}
                            onPointerDown={(event) =>
                              startRectResize(event, target, area, id)
                            }
                            onKeyDown={(event) =>
                              handleRectKeyboard(event, target, id)
                            }
                          />
                        ))
                      : null}
                  </div>
                )
              })
            : null}
        </div>
      </div>

      <div className="canvas-stage__footer">
        <span>
          Preview {previewSize.width} × {previewSize.height}
        </span>
        <span>{interactionHint}</span>
      </div>
    </section>
  )
}
