'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { MAP_POLL_INTERVAL_MS } from '@/constants'
import type { MapMachine } from '@/types'

interface UseFloorMapPollingResult {
  machines: MapMachine[]
  lastUpdated: Date
  refreshMachines: () => Promise<void>
  optimisticMove: (id: string, gridX: number, gridY: number) => void
  revertMove: (id: string, prevX: number | null, prevY: number | null) => void
}

/**
 * Polls /api/map every MAP_POLL_INTERVAL_MS and exposes helpers for
 * optimistic drag-and-drop position updates so the grid never flickers
 * mid-drag.
 */
export function useFloorMapPolling(initial: MapMachine[]): UseFloorMapPollingResult {
  const [machines, setMachines] = useState<MapMachine[]>(initial)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const isDragging = useRef(false)

  const refreshMachines = useCallback(async (): Promise<void> => {
    if (isDragging.current) return
    try {
      const res = await fetch('/api/map')
      if (!res.ok) return
      const json = await res.json() as { data: MapMachine[] }
      setMachines(json.data)
      setLastUpdated(new Date())
    } catch {
      // Network errors during polling are non-fatal; next interval will retry
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(refreshMachines, MAP_POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [refreshMachines])

  const optimisticMove = useCallback((id: string, gridX: number, gridY: number): void => {
    isDragging.current = true
    setMachines((prev) =>
      prev.map((m) => (m.id === id ? { ...m, gridX, gridY } : m))
    )
    isDragging.current = false
  }, [])

  const revertMove = useCallback(
    (id: string, prevX: number | null, prevY: number | null): void => {
      setMachines((prev) =>
        prev.map((m) => (m.id === id ? { ...m, gridX: prevX, gridY: prevY } : m))
      )
    },
    []
  )

  return { machines, lastUpdated, refreshMachines, optimisticMove, revertMove }
}
