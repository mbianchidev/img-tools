import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useHistory } from './useHistory'

describe('useHistory', () => {
  it('records a drag transaction as one undo step', () => {
    const { result } = renderHook(() => useHistory({ x: 0, y: 0 }))

    act(() => {
      result.current.beginTransaction()
      result.current.setTransient({ x: 0.2, y: 0.1 })
      result.current.setTransient({ x: 0.4, y: 0.3 })
      result.current.commitTransaction()
    })

    expect(result.current.value).toEqual({ x: 0.4, y: 0.3 })
    expect(result.current.canUndo).toBe(true)

    act(() => result.current.undo())

    expect(result.current.value).toEqual({ x: 0, y: 0 })
    expect(result.current.canUndo).toBe(false)
  })

  it('ignores undo during a transaction without freezing later updates', () => {
    const { result } = renderHook(() => useHistory({ x: 0, y: 0 }))

    act(() => result.current.set({ x: -0.1, y: -0.1 }))
    act(() => {
      result.current.beginTransaction()
      result.current.setTransient({ x: 0.2, y: 0.1 })
    })
    expect(result.current.isTransactionActive).toBe(true)
    act(() => {
      result.current.undo()
    })
    expect(result.current.isTransactionActive).toBe(true)
    act(() => {
      result.current.setTransient({ x: 0.4, y: 0.3 })
      result.current.commitTransaction()
    })

    expect(result.current.value).toEqual({ x: 0.4, y: 0.3 })
    expect(result.current.isTransactionActive).toBe(false)

    act(() => result.current.undo())

    expect(result.current.value).toEqual({ x: -0.1, y: -0.1 })
  })
})
