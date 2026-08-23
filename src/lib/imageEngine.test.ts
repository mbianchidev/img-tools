import { describe, expect, it } from 'vitest'
import { removeConnectedBackgroundPixels } from './imageEngine'

describe('connected background removal', () => {
  it('clears matching edge pixels while keeping a contrasting subject', () => {
    const pixels = new Uint8ClampedArray([
      255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
      255, 255, 255, 255, 0, 0, 0, 255, 255, 255, 255, 255,
      255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
    ])

    removeConnectedBackgroundPixels(pixels, 3, 3, 10, 1)

    expect(pixels[3]).toBe(0)
    expect(pixels[19]).toBe(255)
    expect(pixels[35]).toBe(0)
  })

  it('does not clear disconnected pixels that differ from the sampled edge', () => {
    const pixels = new Uint8ClampedArray([
      0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255,
      0, 0, 0, 255, 255, 255, 255, 255, 0, 0, 0, 255,
      0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255,
    ])

    removeConnectedBackgroundPixels(pixels, 3, 3, 10, 1)

    expect(pixels[19]).toBe(255)
  })
})
