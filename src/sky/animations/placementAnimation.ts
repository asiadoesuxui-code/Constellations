import { Container, Graphics } from 'pixi.js'
import type { ConstellationRecord } from '../../types/contracts'
import { generateConstellation } from '../generation/generateConstellation'
import { createStarSprite, preloadConstellationAssets } from '../renderer/constellationAssets'
import { addStarGlow, drawDashedLine } from '../renderer/drawStars'
import {
  buildTwinkleStar,
  createStarPhase,
  createStarTwinkleState,
  applyStarTwinkle,
} from './starTwinkle'

export interface PlacementAnimationResult {
  startMs: number
}

export async function runPlacementAnimation(
  worldLayer: Container,
  record: ConstellationRecord,
): Promise<PlacementAnimationResult> {
  await preloadConstellationAssets()
  const geometry = generateConstellation(record.seed, record.colour_palette)
  const container = new Container()
  container.x = record.x
  container.y = record.y
  worldLayer.addChild(container)

  return new Promise((resolve) => {
    const burst = new Graphics()
    container.addChild(burst)

    const twinkleStars = []
    const lineGraphics = new Graphics()
    container.addChild(lineGraphics)

    for (const star of geometry.stars) {
      const glowSprite = addStarGlow(container, star.x, star.y, star.bright, star.glow, star.scale)
      const sprite = createStarSprite(star.x, star.y, star.bright, star.opacity, star.scale)
      container.addChild(sprite)
      twinkleStars.push(
        buildTwinkleStar(sprite, glowSprite, star.bright, star.opacity, createStarPhase(star.x, star.y)),
      )
    }

    const startTime = performance.now()
    const twinkleState = createStarTwinkleState(twinkleStars, startTime, true)
    const burstDuration = 300
    const starStagger = 150
    const lineStagger = 100
    const lineDuration = 200
    const holdDuration = 600

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

      const revealFactors = geometry.stars.map((_, i) => {
        const starElapsed = elapsed - (burstDuration + i * starStagger)
        if (starElapsed < 0) return 0
        return Math.min(starElapsed / 300, 1)
      })
      applyStarTwinkle(twinkleState, startTime + elapsed, 0, revealFactors)

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
        lineGraphics.stroke({ color: geometry.colour, width: 2, alpha: 0.45 })
      }

      const totalDuration =
        linesStart + geometry.edges.length * lineStagger + lineDuration + holdDuration

      if (elapsed < totalDuration) {
        requestAnimationFrame(animate)
      } else {
        container.destroy({ children: true })
        resolve({ startMs: startTime })
      }
    }

    requestAnimationFrame(animate)
  })
}
