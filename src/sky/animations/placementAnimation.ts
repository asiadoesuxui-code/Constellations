import { Container, Graphics } from 'pixi.js'
import type { ConstellationRecord } from '../../types/contracts'
import { generateConstellation } from '../generation/generateConstellation'
import { drawDashedLine } from '../renderer/drawStars'

export function runPlacementAnimation(
  worldLayer: Container,
  record: ConstellationRecord,
): Promise<void> {
  const geometry = generateConstellation(record.seed, record.colour_palette)
  const container = new Container()
  container.x = record.x
  container.y = record.y
  worldLayer.addChild(container)

  return new Promise((resolve) => {
    const burst = new Graphics()
    container.addChild(burst)

    const starGraphics: Graphics[] = []
    const lineGraphics = new Graphics()
    container.addChild(lineGraphics)

    for (let i = 0; i < geometry.stars.length; i++) {
      const g = new Graphics()
      g.alpha = 0
      g.scale.set(0)
      container.addChild(g)
      starGraphics.push(g)
    }

    const startTime = performance.now()
    const burstDuration = 300
    const starStagger = 150
    const lineStagger = 100
    const lineDuration = 200
    const holdDuration = 3500

    const animate = () => {
      const elapsed = performance.now() - startTime

      if (elapsed < burstDuration) {
        const t = elapsed / burstDuration
        burst.clear()
        burst.circle(0, 0, 20 + t * 40)
        burst.stroke({ color: geometry.colour, width: 2, alpha: (1 - t) * 0.5 })
      } else {
        burst.clear()
      }

      geometry.stars.forEach((star, i) => {
        const starStart = burstDuration + i * starStagger
        const starElapsed = elapsed - starStart
        if (starElapsed < 0) return
        const t = Math.min(starElapsed / 300, 1)
        const g = starGraphics[i]
        const twinkle = star.bright ? 0.85 + 0.15 * Math.sin(starElapsed * 0.02) : 1
        g.clear()
        g.scale.set(t)
        g.alpha = t * twinkle

        if (star.bright) {
          const flareLen = 14 * t
          g.moveTo(star.x - flareLen, star.y)
          g.lineTo(star.x + flareLen, star.y)
          g.moveTo(star.x, star.y - flareLen)
          g.lineTo(star.x, star.y + flareLen)
          g.stroke({ color: geometry.colour, width: 0.75, alpha: 0.55 * twinkle })
          g.circle(star.x, star.y, 10 * t)
          g.fill({ color: geometry.glowColour, alpha: 0.32 * twinkle })
        }

        const radius = (star.bright ? 3.6 : 2.2) * t
        g.circle(star.x, star.y, radius)
        g.fill({ color: geometry.colour, alpha: (star.bright ? 1 : 0.82) * twinkle })
      })

      const linesStart = burstDuration + geometry.stars.length * starStagger
      lineGraphics.clear()
      geometry.edges.forEach(([a, b], i) => {
        const lineStart = linesStart + i * lineStagger
        const lineElapsed = elapsed - lineStart
        if (lineElapsed < 0) return
        const t = Math.min(lineElapsed / lineDuration, 1)
        const sa = geometry.stars[a]
        const sb = geometry.stars[b]
        const endX = sa.x + (sb.x - sa.x) * t
        const endY = sa.y + (sb.y - sa.y) * t
        drawDashedLine(lineGraphics, sa.x, sa.y, endX, endY)
      })
      if (elapsed > linesStart) {
        lineGraphics.stroke({ color: geometry.colour, width: 0.75, alpha: 0.45 })
      }

      const totalDuration =
        linesStart + geometry.edges.length * lineStagger + lineDuration + holdDuration

      if (elapsed < totalDuration) {
        requestAnimationFrame(animate)
      } else {
        container.destroy({ children: true })
        resolve()
      }
    }

    requestAnimationFrame(animate)
  })
}
