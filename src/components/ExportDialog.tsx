import { useEffect, useRef } from 'react'
import { ArrowDownToLine, FileImage, Gauge, X } from 'lucide-react'
import type { ExportSettings, ImageFormat } from '../types/editor'

interface ExportDialogProps {
  open: boolean
  busy: boolean
  settings: ExportSettings
  outputSize: { width: number; height: number }
  onSettingsChange: (
    updater: ExportSettings | ((current: ExportSettings) => ExportSettings),
  ) => void
  onClose: () => void
  onExport: () => void
}

export function ExportDialog({
  open,
  busy,
  settings,
  outputSize,
  onSettingsChange,
  onClose,
  onExport,
}: ExportDialogProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }
    const previousFocus = document.activeElement as HTMLElement | null
    closeButtonRef.current?.focus()
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) {
        onClose()
      }
      if (event.key === 'Tab' && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled)',
          ),
        )
        const first = focusable[0]
        const last = focusable.at(-1)
        if (!first || !last) {
          return
        }
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus()
    }
  }, [busy, onClose, open])

  if (!open) {
    return null
  }

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) {
          onClose()
        }
      }}
    >
      <section
        ref={dialogRef}
        className="export-dialog"
        role="dialog"
        aria-modal="true"
        aria-busy={busy}
        aria-labelledby="export-title"
      >
        <div className="export-dialog__header">
          <div>
            <span aria-hidden="true">
              <ArrowDownToLine />
            </span>
            <div>
              <p>Final step</p>
              <h2 id="export-title">Export image</h2>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            className="icon-button"
            type="button"
            aria-label="Close export dialog"
            disabled={busy}
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </button>
        </div>

        <div className="export-summary">
          <div>
            <FileImage aria-hidden="true" />
            <span>
              <small>Dimensions</small>
              <strong>
                {outputSize.width} × {outputSize.height}
              </strong>
            </span>
          </div>
          <div>
            <Gauge aria-hidden="true" />
            <span>
              <small>Compression</small>
              <strong>
                {settings.mode === 'quality'
                  ? `${settings.quality}% quality`
                  : `Under ${settings.targetMegabytes} MB`}
              </strong>
            </span>
          </div>
        </div>

        <div className="dialog-section">
          <span className="control-label">File format</span>
          <div className="dialog-format-grid" role="radiogroup">
            {(['jpeg', 'png', 'webp'] as ImageFormat[]).map((format) => (
              <button
                type="button"
                role="radio"
                aria-checked={settings.format === format}
                className={settings.format === format ? 'is-active' : ''}
                key={format}
                onClick={() =>
                  onSettingsChange((current) => ({ ...current, format }))
                }
              >
                {format === 'jpeg' ? 'JPG' : format.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="dialog-section">
          <span className="control-label">File size</span>
          <div className="segmented">
            <button
              type="button"
              className={settings.mode === 'quality' ? 'is-active' : ''}
              onClick={() =>
                onSettingsChange((current) => ({
                  ...current,
                  mode: 'quality',
                }))
              }
            >
              Quality
            </button>
            <button
              type="button"
              className={settings.mode === 'target' ? 'is-active' : ''}
              onClick={() =>
                onSettingsChange((current) => ({
                  ...current,
                  mode: 'target',
                }))
              }
            >
              Maximum MB
            </button>
          </div>

          {settings.mode === 'quality' ? (
            <label className="range-field">
              <span className="range-field__label">
                Image quality
                <output>{settings.quality}%</output>
              </span>
              <input
                type="range"
                min="4"
                max="100"
                value={settings.quality}
                onChange={(event) =>
                  onSettingsChange((current) => ({
                    ...current,
                    quality: Number(event.target.value),
                  }))
                }
              />
            </label>
          ) : (
            <label className="field">
              <span>Maximum file size</span>
              <div className="field__with-unit">
                <input
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.1"
                  value={settings.targetMegabytes}
                  onChange={(event) =>
                    onSettingsChange((current) => ({
                      ...current,
                      targetMegabytes: Math.max(
                        0.01,
                        Number(event.target.value),
                      ),
                    }))
                  }
                />
                <b>MB</b>
              </div>
            </label>
          )}
        </div>

        <p className="export-dialog__note">
          Processing stays in this tab. Maximum-size export may reduce dimensions
          if format compression cannot reach the target alone.
        </p>

        <button
          className="button button--primary button--wide button--large"
          type="button"
          disabled={busy}
          onClick={onExport}
        >
          {busy ? 'Preparing download…' : 'Download image'}
          <ArrowDownToLine aria-hidden="true" />
        </button>
      </section>
    </div>
  )
}
