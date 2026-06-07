import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  fetchConstellationsInBounds,
  subscribeToInserts,
} from './api/constellations'
import { isSupabaseConfigured } from './lib/supabase/client'
import { SkyCanvas } from './sky/SkyCanvas'
import type { SkyCanvasRef } from './types/contracts'
import { LandingPopup } from './components/LandingPopup'
import { HoverTooltip } from './components/HoverTooltip'
import { ConstellationLabel } from './components/ConstellationLabel'
import { ShareCard } from './components/ShareCard'
import { captureShareCard, downloadImage } from './components/shareCardCapture'
import { useSubmissionFlow } from './hooks/useSubmissionFlow'
import './styles/popup.css'

function App() {
  const skyRef = useRef<SkyCanvasRef>(null)
  const [hover, setHover] = useState<{ wish: string; x: number; y: number } | null>(null)
  const [labelPos, setLabelPos] = useState({ x: 0, y: 0 })
  const getExistingPositions = useCallback(
    () => skyRef.current?.getConstellationPositions() ?? [],
    [],
  )
  const flow = useSubmissionFlow(getExistingPositions)

  const fetchConstellations = useCallback(
    async (bounds: { minX: number; maxX: number; minY: number; maxY: number }) => {
      if (!isSupabaseConfigured()) return []
      return fetchConstellationsInBounds(bounds)
    },
    [],
  )

  const handleHover = useCallback(
    (wish: string | null, screenX: number, screenY: number) => {
      if (flow.phase === 'card' || flow.phase === 'revealing') return
      if (wish) {
        setHover({ wish, x: screenX, y: screenY })
      } else {
        setHover(null)
      }
    },
    [flow.phase],
  )

  const ownConstellationIdRef = useRef<string | null>(null)
  useLayoutEffect(() => {
    ownConstellationIdRef.current = flow.newConstellation?.id ?? null
  }, [flow.newConstellation])

  useEffect(() => {
    return subscribeToInserts((record) => {
      if (record.id === ownConstellationIdRef.current) return
      skyRef.current?.addConstellation(record)
    })
  }, [])

  const onRevealComplete = flow.onRevealComplete

  useEffect(() => {
    if (flow.phase !== 'revealing' || !flow.newConstellation) return

    const record = flow.newConstellation
    let cancelled = false
    skyRef.current?.revealConstellation(record).then(() => {
      if (!cancelled) onRevealComplete()
    })
    return () => {
      cancelled = true
    }
  }, [flow.phase, flow.newConstellation, onRevealComplete])

  useEffect(() => {
    if (flow.phase !== 'card' && flow.phase !== 'revealing') return
    if (!flow.newConstellation) return

    const updatePositions = () => {
      const screen = skyRef.current?.worldToScreen(
        flow.newConstellation!.x,
        flow.newConstellation!.y,
      )
      if (screen) {
        setLabelPos({ x: screen.x, y: screen.y - 130 })
      }
    }

    updatePositions()
    const interval = setInterval(updatePositions, 16)
    return () => clearInterval(interval)
  }, [flow.phase, flow.newConstellation])

  const handleSaveCard = async () => {
    const dataUrl = await captureShareCard()
    if (dataUrl) downloadImage(dataUrl)
    flow.dismissCard()
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <SkyCanvas
        ref={skyRef}
        viewMode={flow.showPopup ? 'landing' : 'exploring'}
        fetchEnabled={flow.phase === 'exploring'}
        ownConstellationId={flow.newConstellation?.id ?? null}
        fetchConstellations={fetchConstellations}
        onHover={handleHover}
      />

      <LandingPopup
        visible={flow.showPopup}
        name={flow.name}
        onNameChange={(v) => {
          flow.setName(v)
          if (flow.error) flow.resetError()
        }}
        wish={flow.wish}
        onWishChange={(v) => {
          flow.setWish(v)
          if (flow.error) flow.resetError()
        }}
        onSubmit={flow.submit}
        onDismiss={flow.dismissPopup}
        isSubmitting={flow.isSubmitting}
        error={flow.error}
      />

      <HoverTooltip wish={hover?.wish ?? null} x={hover?.x ?? 0} y={hover?.y ?? 0} />

      <ConstellationLabel
        visible={flow.phase === 'revealing' || flow.phase === 'card'}
        x={labelPos.x}
        y={labelPos.y}
        wish={flow.newConstellation?.wish ?? ''}
      />

      {flow.showSaveCard && (
        <button type="button" className="save-card-btn" onClick={handleSaveCard}>
          Save your constellation
        </button>
      )}

      {flow.showSaveCard && (
        <button
          type="button"
          className="dismiss-link"
          style={{
            position: 'fixed',
            bottom: '2rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 50,
          }}
          onClick={flow.dismissCard}
        >
          Skip
        </button>
      )}

      <ShareCard record={flow.newConstellation} />
    </div>
  )
}

export default App
