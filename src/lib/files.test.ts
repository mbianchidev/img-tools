import { describe, expect, it } from 'vitest'
import { validateImageFile } from './files'

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
})
