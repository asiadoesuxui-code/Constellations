import { useCallback, useRef, useState } from 'react'
import type { ConstellationRecord } from '../../types/contracts'

export function useConstellationStore() {
  const cacheRef = useRef(new Map<string, ConstellationRecord>())
  const [, setVersion] = useState(0)

  const add = useCallback((record: ConstellationRecord) => {
    if (cacheRef.current.has(record.id)) return
    cacheRef.current.set(record.id, record)
    setVersion((v) => v + 1)
  }, [])

  const addMany = useCallback((records: ConstellationRecord[]) => {
    let changed = false
    for (const record of records) {
      if (!cacheRef.current.has(record.id)) {
        cacheRef.current.set(record.id, record)
        changed = true
      }
    }
    if (changed) setVersion((v) => v + 1)
  }, [])

  const getAll = useCallback(() => [...cacheRef.current.values()], [])

  return { add, addMany, getAll, cache: cacheRef }
}
