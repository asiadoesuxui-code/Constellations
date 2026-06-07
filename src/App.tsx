import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  fetchConstellationsInBounds,
  subscribeToInserts,
} from './api/constellations'
import { isSupabaseConfigured } from './lib/supabase/client'
import { SkyCanvas } from './sky/SkyCanvas'
import type { SkyCanvasRef } from './types/contracts'
import { LandingPopup } from './components/LandingPopup'
import { SkyConstellationLabels } from './components/SkyConstellationLabels'
import { SaveConstellationPopup } from './components/SaveConstellationPopup'
import {
  downloadImage,
  getShareCardOrientation,
  type ShareCardOrientation,
} from './components/shareCardCapture'
import type { SkyCaptureResult } from './types/contracts'
import { useSubmissionFlow } from './hooks/useSubmissionFlow'
import './styles/popup.css'

function App() {
  const skyRef = useRef<SkyCanvasRef>(null)
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

  const [sharePreview, setSharePreview] = useState<
    (SkyCaptureResult & { orientation: ShareCardOrientation }) | null
  >(null)

  const handleSaveCard = async () => {
    const record = flow.newConstellation
    if (!record) return

    await document.fonts.ready

    const orientation = getShareCardOrientation()
    const capture = skyRef.current?.captureConstellationSky(record.id, orientation)
    if (!capture) return

    setSharePreview({ ...capture, orientation })
  }

  const handleDownloadShare = () => {
    if (sharePreview) downloadImage(sharePreview.dataUrl)
  }

  const handleDismissShare = () => {
    setSharePreview(null)
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

      <SkyConstellationLabels
        skyRef={skyRef}
        visible={!flow.showPopup && !sharePreview}
      />

      {flow.showSaveCard && !sharePreview && (
        <button type="button" className="save-card-btn" onClick={handleSaveCard}>
          Save your constellation
        </button>
      )}

      {sharePreview && flow.newConstellation && (
        <SaveConstellationPopup
          visible
          skyDataUrl={sharePreview.dataUrl}
          captureWidth={sharePreview.width}
          captureHeight={sharePreview.height}
          onDownload={handleDownloadShare}
          onDismiss={handleDismissShare}
        />
      )}
    </div>
  )
}

export default App
