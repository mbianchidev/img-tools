import { useEffect, useLayoutEffect, useState } from 'react'
import { EditorPage } from './components/EditorPage'
import { LandingPage } from './components/LandingPage'
import { createDemoFile, loadImageFile } from './lib/files'
import type { LoadedImage } from './types/editor'

export default function App() {
  const [source, setSource] = useState<LoadedImage | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(
    () => () => {
      if (source) {
        URL.revokeObjectURL(source.objectUrl)
      }
    },
    [source],
  )

  useLayoutEffect(() => {
    if (source) {
      window.scrollTo(0, 0)
    }
  }, [source])

  const openFile = async (file: File) => {
    setLoading(true)
    setError(null)
    try {
      const image = await loadImageFile(file)
      setSource(image)
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'The image could not be opened.',
      )
    } finally {
      setLoading(false)
    }
  }

  if (source) {
    return (
      <EditorPage
        key={source.objectUrl}
        source={source}
        onNewImage={() => setSource(null)}
      />
    )
  }

  return (
    <LandingPage
      onFile={openFile}
      onDemo={() => openFile(createDemoFile())}
      onError={setError}
      busy={loading}
      error={error}
    />
  )
}
