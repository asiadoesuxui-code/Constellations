import { useEffect, useState } from 'react'
import type { ConstellationLabelTarget, SkyCanvasRef } from '../types/contracts'
import { firstSentence } from './firstSentence'

const WISH_ZOOM_THRESHOLD = 0.7

interface SkyConstellationLabelsProps {
  skyRef: React.RefObject<SkyCanvasRef | null>
  visible: boolean
}

function nameFontSize(zoom: number, isOwn: boolean): number {
  if (zoom >= WISH_ZOOM_THRESHOLD) {
    return isOwn ? 14 : 12
  }
  const base = isOwn ? 14 : 12
  return Math.max(7, base * zoom * 0.95)
}

export function SkyConstellationLabels({ skyRef, visible }: SkyConstellationLabelsProps) {
  const [labels, setLabels] = useState<ConstellationLabelTarget[]>([])
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    if (!visible) {
      setLabels([])
      return
    }

    const tick = () => {
      const camera = skyRef.current?.getCameraPosition()
      setZoom(camera?.zoom ?? 1)
      setLabels(skyRef.current?.getConstellationLabels() ?? [])
    }

    tick()
    const interval = setInterval(tick, 16)
    return () => clearInterval(interval)
  }, [visible, skyRef])

  if (!visible || labels.length === 0) return null

  const showWish = zoom >= WISH_ZOOM_THRESHOLD

  return (
    <>
      {labels.map((label) => {
        if (!label.name) return null
        const displayWish = firstSentence(label.wish)

        return (
          <div
            key={label.id}
            className={`sky-constellation-label${label.isOwn ? ' sky-constellation-label--own' : ''}`}
            style={{
              left: label.screenX,
              top: label.screenY,
              opacity: label.opacity,
            }}
          >
            <span
              className="sky-constellation-label-name"
              style={{ fontSize: `${nameFontSize(zoom, label.isOwn)}px` }}
            >
              {label.name}
            </span>
            {showWish && displayWish && (
              <span
                className="sky-constellation-label-wish"
                style={{ fontSize: label.isOwn ? '20px' : '16px' }}
              >
                I wish {displayWish}
              </span>
            )}
          </div>
        )
      })}
    </>
  )
}
