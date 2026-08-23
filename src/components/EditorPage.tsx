import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowDownToLine,
  FileImage,
  ImagePlus,
  Redo2,
  RotateCcw,
  Undo2,
} from 'lucide-react'
import { TOOLS } from '../constants/tools'
import { downloadExport, exportCanvas } from '../lib/exportImage'
import { formatBytes, getFileStem, getOutputSize } from '../lib/imageMath'
import { renderImage } from '../lib/imageEngine'
import { useHistory } from '../hooks/useHistory'
import {
  createInitialEditorState,
  type ExportSettings,
  type LoadedImage,
  type ToolId,
} from '../types/editor'
import { Brand } from './Brand'
import { CanvasStage } from './CanvasStage'
import { ExportDialog } from './ExportDialog'
import { ToolPanel } from './ToolPanel'

interface EditorPageProps {
  source: LoadedImage
  onNewImage: () => void
}

const MAX_EXPORT_PIXELS = 100_000_000
const MAX_CANVAS_EDGE = 32_767

export function EditorPage({ source, onNewImage }: EditorPageProps) {
  const history = useHistory(createInitialEditorState())
  const [activeTool, setActiveTool] = useState<ToolId>('compress')
  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    format: 'webp',
    mode: 'quality',
    quality: 86,
    targetMegabytes: 1,
  })
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null)
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null)
  const [selectedBlurId, setSelectedBlurId] = useState<string | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [rendering, setRendering] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const outputSize = useMemo(
    () =>
      getOutputSize(
        source.width,
        source.height,
        history.value.crop,
        history.value.rotation,
        history.value.resizeScale,
      ),
    [
      history.value.crop,
      history.value.resizeScale,
      history.value.rotation,
      source.height,
      source.width,
    ],
  )

  const resetEdits = () => {
    history.reset(createInitialEditorState())
    setSelectedTextId(null)
    setSelectedStickerId(null)
    setSelectedBlurId(null)
    setMessage('All edits reset.')
    setError(null)
  }

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (
        target?.matches('input, textarea, select') ||
        history.isTransactionActive ||
        (!event.metaKey && !event.ctrlKey)
      ) {
        return
      }
      if (event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) {
          history.redo()
        } else {
          history.undo()
        }
      }
      if (event.key.toLowerCase() === 'e') {
        event.preventDefault()
        setExportOpen(true)
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [history])

  const handleRenderingChange = useCallback((value: boolean) => {
    setRendering(value)
  }, [])

  const handlePreviewError = useCallback((value: string | null) => {
    setError(value)
  }, [])

  const handleExport = async () => {
    setExporting(true)
    setError(null)
    setMessage(null)

    try {
      if (
        outputSize.width > MAX_CANVAS_EDGE ||
        outputSize.height > MAX_CANVAS_EDGE ||
        outputSize.width * outputSize.height > MAX_EXPORT_PIXELS
      ) {
        throw new Error(
          'This export is too large for a browser canvas. Reduce the resize scale or crop the image.',
        )
      }

      await new Promise<void>((resolve) =>
        window.requestAnimationFrame(() => resolve()),
      )
      const canvas = renderImage(source, history.value, { applyResize: true })
      const result = await exportCanvas(canvas, exportSettings)
      downloadExport(
        result.blob,
        getFileStem(source.name),
        exportSettings.format,
      )

      const compressionNote = result.resizedForTarget
        ? ` Auto-fit resized the export to ${result.width} × ${result.height}.`
        : ''
      const targetNote = result.targetMet
        ? ''
        : ' The browser could not fully reach the requested maximum.'
      setMessage(
        `Downloaded ${formatBytes(result.blob.size)}.${compressionNote}${targetNote}`,
      )
      setExportOpen(false)
    } catch (exportError) {
      setError(
        exportError instanceof Error
          ? exportError.message
          : 'The image could not be exported.',
      )
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="editor">
      <header className="editor-header">
        <Brand compact />
        <div className="editor-file">
          <FileImage aria-hidden="true" />
          <span>
            <strong>{source.name}</strong>
            <small>
              {source.width} × {source.height} · {formatBytes(source.size)}
            </small>
          </span>
        </div>
        <div className="editor-history" aria-label="Edit history">
          <button
            className="icon-button"
            type="button"
            aria-label="Undo"
            title="Undo (⌘Z)"
            disabled={history.isTransactionActive || !history.canUndo}
            onClick={history.undo}
          >
            <Undo2 aria-hidden="true" />
          </button>
          <button
            className="icon-button"
            type="button"
            aria-label="Redo"
            title="Redo (⇧⌘Z)"
            disabled={history.isTransactionActive || !history.canRedo}
            onClick={history.redo}
          >
            <Redo2 aria-hidden="true" />
          </button>
          <button
            className="button button--quiet button--small reset-button"
            type="button"
            disabled={history.isTransactionActive}
            onClick={resetEdits}
          >
            <RotateCcw aria-hidden="true" />
            Reset
          </button>
        </div>
        <div className="editor-header__actions">
          <button
            className="button button--quiet button--small"
            type="button"
            onClick={onNewImage}
          >
            <ImagePlus aria-hidden="true" />
            New image
          </button>
          <button
            className="button button--primary button--small"
            type="button"
            onClick={() => setExportOpen(true)}
          >
            Export
            <ArrowDownToLine aria-hidden="true" />
          </button>
        </div>
      </header>

      <main className="editor-workspace">
        <nav className="tool-rail" aria-label="Image tools">
          {TOOLS.map(({ id, label, icon: Icon }) => (
            <button
              type="button"
              className={activeTool === id ? 'is-active' : ''}
              aria-current={activeTool === id ? 'page' : undefined}
              key={id}
              onClick={() => setActiveTool(id)}
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <CanvasStage
          source={source}
          state={history.value}
          activeTool={activeTool}
          selectedTextId={selectedTextId}
          selectedStickerId={selectedStickerId}
          selectedBlurId={selectedBlurId}
          onChange={history.set}
          onTransientChange={history.setTransient}
          onInteractionStart={history.beginTransaction}
          onInteractionEnd={history.commitTransaction}
          onSelectedStickerIdChange={setSelectedStickerId}
          onSelectedBlurIdChange={setSelectedBlurId}
          onRenderingChange={handleRenderingChange}
          onError={handlePreviewError}
        />

        <ToolPanel
          activeTool={activeTool}
          state={history.value}
          source={source}
          onChange={history.set}
          exportSettings={exportSettings}
          onExportSettingsChange={setExportSettings}
          onOpenExport={() => setExportOpen(true)}
          selectedTextId={selectedTextId}
          onSelectedTextIdChange={setSelectedTextId}
          selectedStickerId={selectedStickerId}
          onSelectedStickerIdChange={setSelectedStickerId}
          selectedBlurId={selectedBlurId}
          onSelectedBlurIdChange={setSelectedBlurId}
        />
      </main>

      <div className="editor-status" aria-live="polite">
        <span>
          {rendering ? (
            <>
              <i className="spinner" aria-hidden="true" />
              Rendering preview…
            </>
          ) : (
            `Export: ${outputSize.width} × ${outputSize.height}`
          )}
        </span>
        <strong className={error ? 'is-error' : ''}>{error ?? message}</strong>
      </div>

      <ExportDialog
        open={exportOpen}
        busy={exporting}
        settings={exportSettings}
        outputSize={outputSize}
        onSettingsChange={setExportSettings}
        onClose={() => setExportOpen(false)}
        onExport={handleExport}
      />
    </div>
  )
}
