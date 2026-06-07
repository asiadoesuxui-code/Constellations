import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react'
import type {
  BoundingBox,
  ConstellationRecord,
  SkyCanvasRef,
  SkyViewMode,
} from '../types/contracts'
import { PixiSkyRenderer } from './renderer/PixiSkyRenderer'
import type { ConstellationHoverCallback } from './skyApi'
import { toRecordHoverHandler } from './skyApi'

export interface SkyCanvasProps {
  viewMode?: SkyViewMode
  onHover?: ConstellationHoverCallback
  fetchConstellations?: (bounds: BoundingBox) => Promise<ConstellationRecord[]>
  onBoundsChange?: (bounds: BoundingBox) => void
}

export const SkyCanvas = forwardRef<SkyCanvasRef, SkyCanvasProps>(function SkyCanvas(
  { viewMode = 'landing', onHover, fetchConstellations, onBoundsChange },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<PixiSkyRenderer | null>(null)
  const onHoverRef = useRef(onHover)
  const fetchRef = useRef(fetchConstellations)
  const onBoundsRef = useRef(onBoundsChange)
  const viewModeRef = useRef(viewMode)

  onHoverRef.current = onHover
  fetchRef.current = fetchConstellations
  onBoundsRef.current = onBoundsChange
  viewModeRef.current = viewMode

  useImperativeHandle(ref, () => ({
    panTo: async (x, y, durationMs) => {
      await rendererRef.current?.camera.panTo(x, y, durationMs)
    },
    revealConstellation: async (record) => {
      await rendererRef.current?.revealConstellation(record)
    },
    placeNewConstellation: async (wish, x, y) => {
      await rendererRef.current?.placeNewConstellation(wish, x, y)
    },
    loadConstellationsFromData: (constellations) => {
      rendererRef.current?.loadConstellationsFromData(constellations)
    },
    addConstellation: (record) => {
      rendererRef.current?.addConstellation(record)
    },
    setHighlightedId: (id) => {
      rendererRef.current?.setHighlightedId(id)
    },
    setViewMode: (mode: SkyViewMode) => {
      rendererRef.current?.setViewMode(mode)
    },
    setOnHover: (callback) => {
      rendererRef.current?.setOnHover(toRecordHoverHandler(callback))
    },
    getCameraPosition: () =>
      rendererRef.current?.getCameraPosition() ?? { x: 0, y: 0, zoom: 1 },
    worldToScreen: (x, y) =>
      rendererRef.current?.worldToScreen(x, y) ?? { x: 0, y: 0 },
  }))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let cancelled = false
    const renderer = new PixiSkyRenderer({
      onHover: toRecordHoverHandler((wish, screenX, screenY) =>
        onHoverRef.current?.(wish, screenX, screenY),
      ),
      fetchConstellations: (bounds: BoundingBox) =>
        fetchRef.current?.(bounds) ?? Promise.resolve([]),
      onBoundsChange: (bounds: BoundingBox) => onBoundsRef.current?.(bounds),
    })
    rendererRef.current = renderer

    void renderer.init(canvas).then(() => {
      if (cancelled) {
        renderer.destroy()
        return
      }
      renderer.setViewMode(viewModeRef.current)
    })

    return () => {
      cancelled = true
      renderer.destroy()
      if (rendererRef.current === renderer) {
        rendererRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    rendererRef.current?.setViewMode(viewMode)
  }, [viewMode])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        touchAction: 'none',
      }}
    />
  )
})
