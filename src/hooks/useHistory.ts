import { useCallback, useState } from 'react'

interface HistoryState<T> {
  past: T[]
  present: T
  future: T[]
}

type StateUpdater<T> = T | ((current: T) => T)

const HISTORY_LIMIT = 60

export const useHistory = <T,>(initialValue: T) => {
  const [history, setHistory] = useState<HistoryState<T>>({
    past: [],
    present: initialValue,
    future: [],
  })

  const set = useCallback((updater: StateUpdater<T>) => {
    setHistory((current) => {
      const next =
        typeof updater === 'function'
          ? (updater as (value: T) => T)(current.present)
          : updater
      if (Object.is(next, current.present)) {
        return current
      }
      return {
        past: [...current.past, current.present].slice(-HISTORY_LIMIT),
        present: next,
        future: [],
      }
    })
  }, [])

  const undo = useCallback(() => {
    setHistory((current) => {
      const previous = current.past.at(-1)
      if (!previous) {
        return current
      }
      return {
        past: current.past.slice(0, -1),
        present: previous,
        future: [current.present, ...current.future],
      }
    })
  }, [])

  const redo = useCallback(() => {
    setHistory((current) => {
      const next = current.future[0]
      if (!next) {
        return current
      }
      return {
        past: [...current.past, current.present].slice(-HISTORY_LIMIT),
        present: next,
        future: current.future.slice(1),
      }
    })
  }, [])

  const reset = useCallback((value: T) => {
    setHistory({ past: [], present: value, future: [] })
  }, [])

  return {
    value: history.present,
    set,
    undo,
    redo,
    reset,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  }
}
