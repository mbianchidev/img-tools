import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Dropzone } from './Dropzone'

describe('Dropzone', () => {
  it('opens a valid image through the accessible file input', async () => {
    const user = userEvent.setup()
    const onFile = vi.fn()
    render(<Dropzone onFile={onFile} onError={vi.fn()} onDemo={vi.fn()} />)

    const file = new File(['pixels'], 'photo.png', { type: 'image/png' })
    await user.upload(screen.getByLabelText('Choose an image'), file)

    expect(onFile).toHaveBeenCalledWith(file)
  })

  it('explains how to correct an invalid file', async () => {
    const user = userEvent.setup({ applyAccept: false })
    const onError = vi.fn()
    render(<Dropzone onFile={vi.fn()} onError={onError} onDemo={vi.fn()} />)

    await user.upload(
      screen.getByLabelText('Choose an image'),
      new File(['notes'], 'notes.txt', { type: 'text/plain' }),
    )

    expect(onError).toHaveBeenCalledWith(
      expect.stringContaining('Choose an image file'),
    )
  })

  it('offers a demo without requiring a local file', async () => {
    const user = userEvent.setup()
    const onDemo = vi.fn()
    render(<Dropzone onFile={vi.fn()} onError={vi.fn()} onDemo={onDemo} />)

    await user.click(screen.getByRole('button', { name: 'Try the demo image' }))

    expect(onDemo).toHaveBeenCalledOnce()
  })
})
