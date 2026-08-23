import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { Grip, ScanLine } from 'lucide-react'
import { clamp } from '../lib/imageMath'
import { renderImage } from '../lib/imageEngine'
import {
  createInitialEditorState,
  type EditorState,
  type LoadedImage,
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
  onRenderingChange: (rendering: boolean) => void
  onError: (message: string | null) => void
}

type DragTarget =
  | { type: 'text'; id: string }
  | { type: 'sticker'; id: string }
  | { type: 'blur'; id: string }

export function CanvasStage({
  source,
  state,
  activeTool,
  selectedTextId,
  selectedStickerId,
  selectedBlurId,
  onChange,
  onRenderingChange,
  onError,
}: CanvasStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const [previewSize, setPreviewSize] = useState({ width: 1, height: 1 })
  const [showOriginal, setShowOriginal] = useState(false)
  const [dragTarget, setDragTarget] = useState<DragTarget | null>(null)

  useEffect(() => {
    let cancelled = false
    onRenderingChange(true)
    onError(null)

    const frame = window.requestAnimationFrame(() => {
      try {
        const rendered = renderImage(
          source,
          showOriginal ? createInitialEditorState() : state,
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
  }, [onError, onRenderingChange, showOriginal, source, state])

  const updatePosition = (
    target: DragTarget,
    clientX: number,
    clientY: number,
  ) => {
    const bounds = frameRef.current?.getBoundingClientRect()
    if (!bounds || bounds.width === 0 || bounds.height === 0) {
      return
    }
    const x = clamp((clientX - bounds.left) / bounds.width, 0, 1)
    const y = clamp((clientY - bounds.top) / bounds.height, 0, 1)

    onChange((current) => {
      if (target.type === 'text') {
        return {
          ...current,
          textLayers: current.textLayers.map((layer) =>
            layer.id === target.id ? { ...layer, x, y } : layer,
          ),
        }
      }
      if (target.type === 'sticker') {
        return {
          ...current,
          stickerLayers: current.stickerLayers.map((layer) =>
            layer.id === target.id ? { ...layer, x, y } : layer,
          ),
        }
      }
      return {
        ...current,
        blurAreas: current.blurAreas.map((area) =>
          area.id === target.id
            ? {
                ...area,
                x: clamp(x - area.width / 2, 0, 1 - area.width),
                y: clamp(y - area.height / 2, 0, 1 - area.height),
              }
            : area,
        ),
      }
    })
  }

  const startDrag = (
    event: PointerEvent<HTMLButtonElement>,
    target: DragTarget,
  ) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragTarget(target)
    updatePosition(target, event.clientX, event.clientY)
  }

  const handleKeyboardMove = (
    event: KeyboardEvent<HTMLButtonElement>,
    target: DragTarget,
  ) => {
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    }
    const move = moves[event.key]
    if (!move) {
      return
    }
    event.preventDefault()
    const bounds = frameRef.current?.getBoundingClientRect()
    if (!bounds) {
      return
    }
    const step = event.shiftKey ? 10 : 2
    const [deltaX, deltaY] = move
    const rect = event.currentTarget.getBoundingClientRect()
    updatePosition(
      target,
      rect.left + rect.width / 2 + deltaX * step,
      rect.top + rect.height / 2 + deltaY * step,
    )
  }

  const selectedText = state.textLayers.find(({ id }) => id === selectedTextId)
  const selectedSticker = state.stickerLayers.find(
    ({ id }) => id === selectedStickerId,
  )
  const selectedBlur = state.blurAreas.find(({ id }) => id === selectedBlurId)

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

      <div className="canvas-stage__viewport">
        <div
          ref={frameRef}
          className="canvas-frame"
          style={{
            aspectRatio: `${previewSize.width} / ${previewSize.height}`,
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
              onPointerDown={(event) =>
                startDrag(event, { type: 'text', id: selectedText.id })
              }
              onPointerMove={(event) => {
                if (dragTarget?.type === 'text') {
                  updatePosition(dragTarget, event.clientX, event.clientY)
                }
              }}
              onPointerUp={() => setDragTarget(null)}
              onPointerCancel={() => setDragTarget(null)}
              onKeyDown={(event) =>
                handleKeyboardMove(event, { type: 'text', id: selectedText.id })
              }
            >
              <Grip aria-hidden="true" />
            </button>
          ) : null}

          {!showOriginal && activeTool === 'stickers' && selectedSticker ? (
            <button
              className="layer-handle"
              type="button"
              style={{
                left: `${selectedSticker.x * 100}%`,
                top: `${selectedSticker.y * 100}%`,
              }}
              aria-label="Move selected sticker"
              onPointerDown={(event) =>
                startDrag(event, { type: 'sticker', id: selectedSticker.id })
              }
              onPointerMove={(event) => {
                if (dragTarget?.type === 'sticker') {
                  updatePosition(dragTarget, event.clientX, event.clientY)
                }
              }}
              onPointerUp={() => setDragTarget(null)}
              onPointerCancel={() => setDragTarget(null)}
              onKeyDown={(event) =>
                handleKeyboardMove(event, {
                  type: 'sticker',
                  id: selectedSticker.id,
                })
              }
            >
              <Grip aria-hidden="true" />
            </button>
          ) : null}

          {!showOriginal && activeTool === 'blur' && selectedBlur ? (
            <button
              className="blur-handle"
              type="button"
              style={{
                left: `${selectedBlur.x * 100}%`,
                top: `${selectedBlur.y * 100}%`,
                width: `${selectedBlur.width * 100}%`,
                height: `${selectedBlur.height * 100}%`,
              }}
              aria-label="Move selected blur area"
              onPointerDown={(event) =>
                startDrag(event, { type: 'blur', id: selectedBlur.id })
              }
              onPointerMove={(event) => {
                if (dragTarget?.type === 'blur') {
                  updatePosition(dragTarget, event.clientX, event.clientY)
                }
              }}
              onPointerUp={() => setDragTarget(null)}
              onPointerCancel={() => setDragTarget(null)}
              onKeyDown={(event) =>
                handleKeyboardMove(event, { type: 'blur', id: selectedBlur.id })
              }
            >
              <span>Blur area</span>
            </button>
          ) : null}
        </div>
      </div>

      <div className="canvas-stage__footer">
        <span>
          Preview {previewSize.width} × {previewSize.height}
        </span>
        <span>Use the controls or drag selected layers</span>
      </div>
    </section>
  )
}
