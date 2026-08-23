import { describe, expect, it } from 'vitest'
import { validateImageFile, validateStickerImageFile } from './files'

describe('image file validation', () => {
  it('accepts browser-readable images', () => {
    expect(
      validateImageFile(new File(['pixels'], 'photo.webp', { type: 'image/webp' })),
    ).toBeNull()
  })

  it('rejects non-image files with a useful correction', () => {
    expect(
      validateImageFile(new File(['text'], 'notes.txt', { type: 'text/plain' })),
    ).toContain('Choose an image file')
  })

  it('accepts local image stickers and rejects other file types', () => {
    expect(
      validateStickerImageFile(
        new File(['pixels'], 'badge.png', { type: 'image/png' }),
      ),
    ).toBeNull()
    expect(
      validateStickerImageFile(
        new File(['markup'], 'badge.html', { type: 'text/html' }),
      ),
    ).toContain('image for the sticker')
  })
})
