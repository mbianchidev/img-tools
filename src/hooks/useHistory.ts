import { useCallback, useRef, useState } from 'react'

interface HistoryState<T> {
  past: T[]
  present: T
  future: T[]
}

type StateUpdater<T> = T | ((current: T) => T)

const HISTORY_LIMIT = 60

export const useHistory = <T,>(initialValue: T) => {
  const presentRef = useRef(initialValue)
  const transactionActiveRef = useRef(false)
  const transactionStartRef = useRef(initialValue)
  const [isTransactionActive, setIsTransactionActive] = useState(false)
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
      presentRef.current = next
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

  const beginTransaction = useCallback(() => {
    if (transactionActiveRef.current) {
      return
    }
    transactionStartRef.current = presentRef.current
    transactionActiveRef.current = true
    setIsTransactionActive(true)
  }, [])

  const setTransient = useCallback((updater: StateUpdater<T>) => {
    if (!transactionActiveRef.current) {
      return
    }

    setHistory((current) => {
      const next =
        typeof updater === 'function'
          ? (updater as (value: T) => T)(current.present)
          : updater
      presentRef.current = next
      return Object.is(next, current.present)
        ? current
        : { ...current, present: next }
    })
  }, [])

  const commitTransaction = useCallback(() => {
    if (!transactionActiveRef.current) {
      return
    }

    transactionActiveRef.current = false
    setIsTransactionActive(false)
    setHistory((current) => {
      const start = transactionStartRef.current
      if (Object.is(start, current.present)) {
        return current
      }
      return {
        past: [...current.past, start].slice(-HISTORY_LIMIT),
        present: current.present,
        future: [],
      }
    })
  }, [])

  const undo = useCallback(() => {
    if (transactionActiveRef.current) {
      return
    }
    setHistory((current) => {
      const previous = current.past.at(-1)
      if (!previous) {
        return current
      }
      presentRef.current = previous
      return {
        past: current.past.slice(0, -1),
        present: previous,
        future: [current.present, ...current.future],
      }
    })
  }, [])

  const redo = useCallback(() => {
    if (transactionActiveRef.current) {
      return
    }
    setHistory((current) => {
      const next = current.future[0]
      if (!next) {
        return current
      }
      presentRef.current = next
      return {
        past: [...current.past, current.present].slice(-HISTORY_LIMIT),
        present: next,
        future: current.future.slice(1),
      }
    })
  }, [])

  const reset = useCallback((value: T) => {
    presentRef.current = value
    transactionActiveRef.current = false
    setIsTransactionActive(false)
    setHistory({ past: [], present: value, future: [] })
  }, [])

  return {
    value: history.present,
    set,
    beginTransaction,
    setTransient,
    commitTransaction,
    undo,
    redo,
    reset,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    isTransactionActive,
  }
}
