import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import type {
  BoundingBox,
  ConstellationRecord,
  SkyCanvasRef,
  SkyViewMode,
} from '../types/contracts'
import { PixiSkyRenderer, type SkyRendererOptions } from './renderer/PixiSkyRenderer'
import { dismissSkyBoot } from './skyBoot'
import type { ConstellationHoverCallback } from './skyApi'
import { toRecordHoverHandler } from './skyApi'

export interface SkyCanvasProps {
  viewMode?: SkyViewMode
  fetchEnabled?: boolean
  ownConstellationId?: string | null
  onHover?: ConstellationHoverCallback
  fetchConstellations?: (bounds: BoundingBox) => Promise<ConstellationRecord[]>
  onBoundsChange?: (bounds: BoundingBox) => void
}

const MAX_CANVAS_RETRIES = 2

const CANVAS_STYLE =
  'position:absolute;inset:0;width:100%;height:100%;touch-action:none;display:block'

function createCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.style.cssText = CANVAS_STYLE
  return canvas
}

export const SkyCanvas = forwardRef<SkyCanvasRef, SkyCanvasProps>(function SkyCanvas(
  {
    viewMode = 'landing',
    fetchEnabled = false,
    ownConstellationId = null,
    onHover,
    fetchConstellations,
    onBoundsChange,
  },
  ref,
) {
  const [canvasKey, setCanvasKey] = useState(0)
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rendererRef = useRef<PixiSkyRenderer | null>(null)
  const onHoverRef = useRef(onHover)
  const fetchRef = useRef(fetchConstellations)
  const onBoundsRef = useRef(onBoundsChange)
  const viewModeRef = useRef(viewMode)
  const fetchEnabledRef = useRef(fetchEnabled)
  const ownConstellationIdRef = useRef(ownConstellationId)

  onHoverRef.current = onHover
  fetchRef.current = fetchConstellations
  onBoundsRef.current = onBoundsChange
  viewModeRef.current = viewMode
  fetchEnabledRef.current = fetchEnabled
  ownConstellationIdRef.current = ownConstellationId

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
      void rendererRef.current?.addConstellation(record)
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
    getConstellationPositions: () =>
      rendererRef.current?.getConstellationPositions() ?? [],
    getConstellationLabels: () =>
      rendererRef.current?.getConstellationLabels() ?? [],
    captureConstellationSky: (constellationId, orientation) =>
      rendererRef.current?.captureConstellationSky(constellationId, orientation) ?? null,
  }))

  useLayoutEffect(() => {
    const host = hostRef.current
    if (!host) return

    let cancelled = false
    const canvas = createCanvas()
    const renderer = new PixiSkyRenderer({
      onHover: toRecordHoverHandler((wish, screenX, screenY) =>
        onHoverRef.current?.(wish, screenX, screenY),
      ),
      fetchConstellations: (bounds: BoundingBox) =>
        fetchRef.current?.(bounds) ?? Promise.resolve([]),
      onBoundsChange: (bounds: BoundingBox) => onBoundsRef.current?.(bounds),
    } satisfies SkyRendererOptions)

    void renderer.init(canvas).then((ready) => {
      if (cancelled) {
        renderer.destroy()
        return
      }

      if (!ready) {
        renderer.destroy()
        if (canvasKey < MAX_CANVAS_RETRIES) {
          setCanvasKey((key) => key + 1)
        } else {
          dismissSkyBoot()
        }
        return
      }

      host.appendChild(canvas)
      canvasRef.current = canvas
      rendererRef.current = renderer
      renderer.setViewMode(viewModeRef.current)
      renderer.setFetchEnabled(fetchEnabledRef.current)
      renderer.setOwnConstellationId(ownConstellationIdRef.current)
      requestAnimationFrame(() => {
        if (!cancelled) dismissSkyBoot()
      })
    })

    return () => {
      cancelled = true
      renderer.destroy()
      canvas.remove()
      canvasRef.current = null
      if (rendererRef.current === renderer) {
        rendererRef.current = null
      }
    }
  }, [canvasKey])

  useEffect(() => {
    rendererRef.current?.setViewMode(viewMode)
  }, [viewMode])

  useEffect(() => {
    rendererRef.current?.setFetchEnabled(fetchEnabled)
  }, [fetchEnabled])

  useEffect(() => {
    rendererRef.current?.setOwnConstellationId(ownConstellationId)
  }, [ownConstellationId])

  return (
    <div
      ref={hostRef}
      style={{
        position: 'absolute',
        inset: 0,
        background: '#0a0a0a',
      }}
    />
  )
})
