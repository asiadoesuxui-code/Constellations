import { Container, Graphics, Sprite } from 'pixi.js'
import type { ConstellationLineStyle } from './constellationAssets'
import { createStarGlowSprite, createStarSprite } from './constellationAssets'

const ROUND_STROKE = { cap: 'round' as const, join: 'round' as const }

function appendDashedLinePath(
  g: Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  dash: number,
  gap: number,
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

function strokeSoftLineLayers(
  glowG: Graphics | null | undefined,
  coreG: Graphics,
  style: ConstellationLineStyle,
  widthScale = 1,
  alphaScale = 1,
): void {
  const color = style.color
  if (glowG) {
    glowG.stroke({
      color,
      width: style.glowWidth * widthScale,
      alpha: style.glowAlpha * alphaScale,
      ...ROUND_STROKE,
    })
  }
  coreG.stroke({
    color,
    width: style.coreWidth * widthScale,
    alpha: style.coreAlpha * alphaScale,
    ...ROUND_STROKE,
  })
}

function drawTaperedSoftDashedLine(
  glowG: Graphics | null | undefined,
  coreG: Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  progress: number,
  style: ConstellationLineStyle,
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
    const seg = Math.min(drawing ? style.dash : style.gap, drawLen - dist)
    if (drawing) {
      const midDist = dist + seg / 2
      const midT = midDist / len
      const widthScale = 0.35 + 0.65 * midT
      const alphaScale = 0.55 + 0.45 * midT
      const sx = x1 + ux * dist
      const sy = y1 + uy * dist
      const ex = x1 + ux * (dist + seg)
      const ey = y1 + uy * (dist + seg)

      if (glowG) {
        glowG.moveTo(sx, sy)
        glowG.lineTo(ex, ey)
        glowG.stroke({
          color: style.color,
          width: style.glowWidth * widthScale,
          alpha: style.glowAlpha * alphaScale,
          ...ROUND_STROKE,
        })
      }
      coreG.moveTo(sx, sy)
      coreG.lineTo(ex, ey)
      coreG.stroke({
        color: style.color,
        width: style.coreWidth * widthScale,
        alpha: style.coreAlpha * alphaScale,
        ...ROUND_STROKE,
      })
    }
    dist += seg
    drawing = !drawing
  }
}

export function drawConstellationLines(
  coreG: Graphics,
  stars: { x: number; y: number }[],
  edges: [number, number][],
  style: ConstellationLineStyle,
  glowG?: Graphics | null,
): void {
  drawConstellationLinesProgress(
    coreG,
    stars,
    edges,
    edges.map(() => 1),
    style,
    glowG,
  )
}

export function drawConstellationLinesProgress(
  coreG: Graphics,
  stars: { x: number; y: number }[],
  edges: [number, number][],
  edgeProgress: number[],
  style: ConstellationLineStyle,
  glowG?: Graphics | null,
  taperedReveal = false,
): void {
  coreG.clear()
  glowG?.clear()

  edges.forEach(([a, b], i) => {
    const t = edgeProgress[i] ?? 0
    if (t <= 0) return
    const sa = stars[a]
    const sb = stars[b]

    if (taperedReveal && t < 1) {
      drawTaperedSoftDashedLine(glowG, coreG, sa.x, sa.y, sb.x, sb.y, t, style)
      return
    }

    const endX = sa.x + (sb.x - sa.x) * t
    const endY = sa.y + (sb.y - sa.y) * t
    if (glowG) {
      appendDashedLinePath(glowG, sa.x, sa.y, endX, endY, style.dash, style.gap)
    }
    appendDashedLinePath(coreG, sa.x, sa.y, endX, endY, style.dash, style.gap)
  })

  const hasDashed = edges.some((_, i) => {
    const t = edgeProgress[i] ?? 0
    return t > 0 && (!taperedReveal || t >= 1)
  })
  if (hasDashed) {
    strokeSoftLineLayers(glowG, coreG, style)
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
  drawConstellationLines(g, stars, edges, {
    color: LANDING_GOLD,
    coreWidth: 1.4,
    coreAlpha: alpha * 0.55,
    coreBlur: 0.9,
    glowWidth: 3.2,
    glowAlpha: alpha * 0.22,
    glowBlur: 2,
    dash: 5,
    gap: 6,
  })
}
