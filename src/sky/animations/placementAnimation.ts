import { Container, Graphics, Sprite } from 'pixi.js'
import type { ConstellationRecord } from '../../types/contracts'
import { generateConstellation } from '../generation/generateConstellation'
import { createStarSprite, preloadConstellationAssets } from '../renderer/constellationAssets'
import { drawDashedLine } from '../renderer/drawStars'

export async function runPlacementAnimation(
  worldLayer: Container,
  record: ConstellationRecord,
): Promise<void> {
  await preloadConstellationAssets()
  const geometry = generateConstellation(record.seed, record.colour_palette)
  const container = new Container()
  container.x = record.x
  container.y = record.y
  worldLayer.addChild(container)

  return new Promise((resolve) => {
    const burst = new Graphics()
    container.addChild(burst)

    const starSprites: Sprite[] = []
    const lineGraphics = new Graphics()
    container.addChild(lineGraphics)

    for (const star of geometry.stars) {
      const sprite = createStarSprite(star.x, star.y, star.bright)
      sprite.alpha = 0
      sprite.scale.set(0)
      container.addChild(sprite)
      starSprites.push(sprite)
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
        const sprite = starSprites[i]
        const twinkle = star.bright ? 0.85 + 0.15 * Math.sin(starElapsed * 0.02) : 1
        sprite.scale.set(t)
        sprite.alpha = t * twinkle
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
