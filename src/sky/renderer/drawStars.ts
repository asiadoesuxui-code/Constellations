import { Container, Graphics } from 'pixi.js'

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
): void {
  for (const [a, b] of edges) {
    const sa = stars[a]
    const sb = stars[b]
    drawDashedLine(g, sa.x, sa.y, sb.x, sb.y)
  }
  g.stroke({ color, width: 1, alpha })
}

export function addStarGraphics(
  container: Container,
  x: number,
  y: number,
  bright: boolean,
  color: string | number,
  glowColour: string | number,
): Graphics {
  if (bright) {
    const glow = new Graphics()
    glow.circle(x, y, 10)
    glow.fill({ color: glowColour, alpha: 0.32 })
    container.addChild(glow)

    const flare = new Graphics()
    const flareLen = 14
    flare.moveTo(x - flareLen, y)
    flare.lineTo(x + flareLen, y)
    flare.moveTo(x, y - flareLen)
    flare.lineTo(x, y + flareLen)
    flare.stroke({ color, width: 0.75, alpha: 0.55 })
    container.addChild(flare)
  }

  const star = new Graphics()
  const radius = bright ? 3.6 : 2.2
  star.circle(x, y, radius)
  star.fill({ color, alpha: bright ? 1 : 0.82 })
  container.addChild(star)
  return star
}
