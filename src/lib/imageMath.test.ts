import { describe, expect, it } from 'vitest'
import {
  buildFilterString,
  centerCropForAspect,
  constrainCrop,
  fitWithin,
  formatBytes,
  getLayerRenderSize,
  getOutputSize,
  getRotatedSize,
  moveNormalizedRect,
  resizeNormalizedRect,
} from './imageMath'

describe('image math', () => {
  it('swaps output dimensions for quarter turns', () => {
    expect(getRotatedSize(1600, 900, 90)).toEqual({
      width: 900,
      height: 1600,
    })
    expect(getRotatedSize(1600, 900, -90)).toEqual({
      width: 900,
      height: 1600,
    })
  })

  it('centers an aspect crop inside the current crop', () => {
    expect(
      centerCropForAspect({ x: 0, y: 0, width: 1, height: 1 }, 16 / 9),
    ).toEqual({
      x: 0,
      y: 0.21875,
      width: 1,
      height: 0.5625,
    })
  })

  it('accounts for the source pixel aspect when cropping a landscape image', () => {
    expect(
      centerCropForAspect(
        { x: 0, y: 0, width: 1, height: 1 },
        1,
        1600 / 1050,
      ),
    ).toEqual({
      x: 0.171875,
      y: 0,
      width: 0.65625,
      height: 1,
    })
  })

  it('keeps custom crops inside the source image', () => {
    expect(
      constrainCrop({ x: 0.8, y: -0.2, width: 0.7, height: 0.02 }),
    ).toEqual({
      x: 0.8,
      y: 0,
      width: 0.19999999999999996,
      height: 0.05,
    })
  })

  it('moves masks without letting them leave the image', () => {
    expect(
      moveNormalizedRect(
        { x: 0.7, y: 0.1, width: 0.25, height: 0.4 },
        0.2,
        -0.3,
      ),
    ).toEqual({
      x: 0.75,
      y: 0,
      width: 0.25,
      height: 0.4,
    })
  })

  it('resizes masks from each corner while preserving minimum dimensions', () => {
    expect(
      resizeNormalizedRect(
        { x: 0.2, y: 0.2, width: 0.5, height: 0.5 },
        'north-west',
        0.6,
        0.6,
      ),
    ).toEqual({
      x: 0.65,
      y: 0.65,
      width: 0.05,
      height: 0.05,
    })

    expect(
      resizeNormalizedRect(
        { x: 0.2, y: 0.2, width: 0.5, height: 0.5 },
        'south-east',
        0.6,
        0.6,
      ),
    ).toEqual({
      x: 0.2,
      y: 0.2,
      width: 0.8,
      height: 0.8,
    })
  })

  it('sizes custom image stickers without stretching their aspect ratio', () => {
    expect(getLayerRenderSize(1200, 800, 25, 2)).toEqual({
      width: 400,
      height: 200,
    })
    expect(getLayerRenderSize(1200, 800, 25, 0.5)).toEqual({
      width: 100,
      height: 200,
    })
  })

  it('calculates crop, rotation, and resize output dimensions', () => {
    expect(
      getOutputSize(
        4000,
        3000,
        { x: 0, y: 0, width: 0.5, height: 0.5 },
        90,
        2,
      ),
    ).toEqual({
      width: 3000,
      height: 4000,
    })
  })

  it('builds a complete canvas filter chain', () => {
    expect(
      buildFilterString({
        brightness: 110,
        contrast: 95,
        saturation: 120,
        grayscale: 5,
        sepia: 10,
        hue: 15,
        blur: 2,
        vignette: 0,
      }),
    ).toBe(
      'brightness(110%) contrast(95%) saturate(120%) grayscale(5%) sepia(10%) hue-rotate(15deg) blur(2px)',
    )
  })

  it('fits previews without enlarging smaller images', () => {
    expect(fitWithin(4000, 2000, 1000)).toEqual({
      width: 1000,
      height: 500,
    })
    expect(fitWithin(600, 400, 1000)).toEqual({
      width: 600,
      height: 400,
    })
  })

  it('formats export sizes for people', () => {
    expect(formatBytes(800)).toBe('800 B')
    expect(formatBytes(1536)).toBe('1.50 KB')
    expect(formatBytes(12 * 1024 * 1024)).toBe('12.0 MB')
  })
})
