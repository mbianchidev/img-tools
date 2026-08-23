import { useRef, useState, type DragEvent } from 'react'
import { ArrowUpRight, ImagePlus, ShieldCheck } from 'lucide-react'
import { validateImageFile } from '../lib/files'

interface DropzoneProps {
  onFile: (file: File) => void
  onError: (message: string) => void
  onDemo: () => void
  busy?: boolean
}

const ACCEPTED_TYPES =
  'image/jpeg,image/png,image/webp,image/avif,image/gif,image/svg+xml'

export function Dropzone({
  onFile,
  onError,
  onDemo,
  busy = false,
}: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const chooseFile = (file?: File) => {
    if (!file) {
      return
    }
    const error = validateImageFile(file)
    if (error) {
      onError(error)
      return
    }
    onFile(file)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    chooseFile(event.dataTransfer.files[0])
  }

  return (
    <div
      className={`dropzone ${dragging ? 'dropzone--dragging' : ''}`}
      onDragEnter={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setDragging(false)
        }
      }}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept={ACCEPTED_TYPES}
        onChange={(event) => {
          chooseFile(event.target.files?.[0])
          event.target.value = ''
        }}
        aria-label="Choose an image"
      />
      <span className="dropzone__icon" aria-hidden="true">
        <ImagePlus />
      </span>
      <div>
        <p className="dropzone__title">
          {busy ? 'Opening image…' : 'Drop an image here'}
        </p>
        <p className="dropzone__hint">JPG, PNG, WebP, AVIF, GIF, or SVG · up to 80 MB</p>
      </div>
      <button
        className="button button--primary"
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        Choose image
        <ArrowUpRight aria-hidden="true" />
      </button>
      <button
        className="button button--quiet"
        type="button"
        disabled={busy}
        onClick={onDemo}
      >
        Try the demo image
      </button>
      <div className="dropzone__privacy">
        <ShieldCheck aria-hidden="true" />
        Processed in this tab. Nothing is uploaded.
      </div>
    </div>
  )
}
