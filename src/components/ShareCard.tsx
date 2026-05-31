import { useEffect, useRef } from 'react'
import type { ConstellationRecord } from '../types/contracts'
import { generateConstellation } from '../sky/generation/generateConstellation'
import '../styles/share-card.css'

interface ShareCardProps {
  record: ConstellationRecord | null
}

export function ShareCard({ record }: ShareCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!record || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!
    const dpr = 2
    const size = 200
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, size, size)

    const geometry = generateConstellation(record.seed, record.colour_palette)
    ctx.translate(size / 2, size / 2)

    for (const [a, b] of geometry.edges) {
      const sa = geometry.stars[a]
      const sb = geometry.stars[b]
      ctx.beginPath()
      ctx.moveTo(sa.x * 2.5, sa.y * 2.5)
      ctx.lineTo(sb.x * 2.5, sb.y * 2.5)
      ctx.strokeStyle = geometry.colour
      ctx.globalAlpha = 0.5
      ctx.lineWidth = 1
      ctx.stroke()
    }

    for (const star of geometry.stars) {
      const sx = star.x * 2.5
      const sy = star.y * 2.5
      const radius = star.bright ? 3 : 1.8

      if (star.bright) {
        const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 12)
        glow.addColorStop(0, geometry.glowColour)
        glow.addColorStop(1, 'transparent')
        ctx.fillStyle = glow
        ctx.globalAlpha = 1
        ctx.beginPath()
        ctx.arc(sx, sy, 12, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.fillStyle = geometry.colour
      ctx.globalAlpha = 1
      ctx.beginPath()
      ctx.arc(sx, sy, radius, 0, Math.PI * 2)
      ctx.fill()
    }
  }, [record])

  if (!record) return null

  return (
    <div className="share-card-offscreen">
      <div className="share-card" id="share-card">
        <canvas ref={canvasRef} className="share-card-constellation" width={400} height={400} />
        <p className="share-card-wish">&ldquo;{record.wish}&rdquo;</p>
        <p className="share-card-brand">
          <span>Constellations</span> — wishes in the night sky
        </p>
      </div>
    </div>
  )
}
