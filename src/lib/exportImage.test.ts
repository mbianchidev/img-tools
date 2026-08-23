import { describe, expect, it } from 'vitest'
import { calculateTargetScale } from './exportImage'

describe('target-size compression', () => {
  it('uses the square-root size ratio to reduce dimensions', () => {
    expect(calculateTargetScale(4_000_000, 1_000_000)).toBeCloseTo(0.5)
  })

  it('avoids over-aggressive and ineffective resize steps', () => {
    expect(calculateTargetScale(100_000_000, 10_000)).toBe(0.5)
    expect(calculateTargetScale(1_010_000, 1_000_000)).toBeCloseTo(0.9353)
  })
})
