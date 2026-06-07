import { Container, Graphics, Sprite } from 'pixi.js'
import { createStarGlowSprite, createStarSprite } from './constellationAssets'

export function drawDashedLine(
  g: Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  dash = 5,
  gap = 6,
): void {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy)
  if (len === 0) return

  const ux = dx / len
  const uy = dy / len
  let dist = 0
  let drawing = true

  while (dist < len) {
    const seg = Math.min(drawing ? dash : gap, len - dist)
    if (drawing) {
      g.moveTo(x1 + ux * dist, y1 + uy * dist)
      g.lineTo(x1 + ux * (dist + seg), y1 + uy * (dist + seg))
    }
    dist += seg
    drawing = !drawing
  }
}

export function drawConstellationLines(
  g: Graphics,
  stars: { x: number; y: number }[],
  edges: [number, number][],
  color: string | number,
  alpha = 0.45,
  lineWidth = 2,
): void {
  drawConstellationLinesProgress(
    g,
    stars,
    edges,
    edges.map(() => 1),
    color,
    alpha,
    lineWidth,
  )
}

function drawTaperedDashedLine(
  g: Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  progress: number,
  minWidth: number,
  maxWidth: number,
  color: string | number,
  alpha: number,
  dash = 5,
  gap = 6,
): void {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy)
  if (len === 0 || progress <= 0) return

  const drawLen = len * progress
  const ux = dx / len
  const uy = dy / len
  let dist = 0
  let drawing = true

  while (dist < drawLen) {
    const seg = Math.min(drawing ? dash : gap, drawLen - dist)
    if (drawing) {
      const midDist = dist + seg / 2
      const midT = midDist / len
      const width = minWidth + (maxWidth - minWidth) * midT
      const segAlpha = alpha * (0.5 + 0.5 * midT)
      g.moveTo(x1 + ux * dist, y1 + uy * dist)
      g.lineTo(x1 + ux * (dist + seg), y1 + uy * (dist + seg))
      g.stroke({ color, width, alpha: segAlpha })
    }
    dist += seg
    drawing = !drawing
  }
}

export function drawConstellationLinesProgress(
  g: Graphics,
  stars: { x: number; y: number }[],
  edges: [number, number][],
  edgeProgress: number[],
  color: string | number,
  alpha = 0.45,
  lineWidth = 2,
  taperedReveal = false,
): void {
  g.clear()

  edges.forEach(([a, b], i) => {
    const t = edgeProgress[i] ?? 0
    if (t <= 0) return
    const sa = stars[a]
    const sb = stars[b]

    if (taperedReveal && t < 1) {
      drawTaperedDashedLine(
        g,
        sa.x,
        sa.y,
        sb.x,
        sb.y,
        t,
        Math.max(0.35, lineWidth * 0.22),
        lineWidth,
        color,
        alpha,
      )
      return
    }

    const endX = sa.x + (sb.x - sa.x) * t
    const endY = sa.y + (sb.y - sa.y) * t
    drawDashedLine(g, sa.x, sa.y, endX, endY)
  })

  const hasDashed = edges.some((_, i) => {
    const t = edgeProgress[i] ?? 0
    return t > 0 && (!taperedReveal || t >= 1)
  })
  if (hasDashed) {
    g.stroke({ color, width: lineWidth, alpha })
  }
}

export function addStarGlow(
  container: Container,
  x: number,
  y: number,
  bright: boolean,
  glow: number,
  scale: number,
): Sprite {
  const glowSprite = createStarGlowSprite(x, y, bright, glow, scale)
  container.addChild(glowSprite)
  return glowSprite
}

export function addStarGraphics(
  container: Container,
  x: number,
  y: number,
  bright: boolean,
  opacity = 1,
  scale = 1,
  glow = 1,
): { sprite: Sprite; glow: Sprite } {
  const glowSprite = addStarGlow(container, x, y, bright, glow, scale)
  const sprite = createStarSprite(x, y, bright, opacity, scale)
  container.addChild(sprite)
  return { sprite, glow: glowSprite }
}

const LANDING_GOLD = 0xf5e6cc
const LANDING_GLOW = 0xf5e6cc

/** Brighter decorative stars for the landing sky — noticeably above ambient noise. */
export function addLandingStarGraphics(
  container: Container,
  x: number,
  y: number,
  bright: boolean,
): Graphics {
  const outerGlow = new Graphics()
  outerGlow.circle(x, y, bright ? 18 : 11)
  outerGlow.fill({ color: LANDING_GLOW, alpha: bright ? 0.22 : 0.13 })
  container.addChild(outerGlow)

  const innerGlow = new Graphics()
  innerGlow.circle(x, y, bright ? 10 : 6.5)
  innerGlow.fill({ color: LANDING_GLOW, alpha: bright ? 0.38 : 0.24 })
  container.addChild(innerGlow)

  if (bright) {
    const flare = new Graphics()
    const flareLen = 20
    flare.moveTo(x - flareLen, y)
    flare.lineTo(x + flareLen, y)
    flare.moveTo(x, y - flareLen)
    flare.lineTo(x, y + flareLen)
    flare.stroke({ color: LANDING_GOLD, width: 0.9, alpha: 0.68 })
    container.addChild(flare)
  }

  const star = new Graphics()
  star.circle(x, y, bright ? 4.0 : 2.8)
  star.fill({ color: 0xffffff, alpha: bright ? 1 : 0.9 })
  container.addChild(star)
  return star
}

export function drawLandingConstellationLines(
  g: Graphics,
  stars: { x: number; y: number }[],
  edges: [number, number][],
  alpha = 0.68,
): void {
  drawConstellationLines(g, stars, edges, LANDING_GOLD, alpha)
}
