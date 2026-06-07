import type { ConstellationGeometry } from '../../types/contracts'
import { DESIGN_GOLD } from '../renderer/constellationAssets'
import { getPaletteColours } from './colourPalettes'
import { deriveColourPalette, hashWish } from './hashSeed'
import { SeededRandom } from './seededRandom'

export { hashWish, deriveColourPalette } from './hashSeed'

interface PathStar {
  x: number
  y: number
  bright: boolean
  opacity: number
  scale: number
  glow: number
}

function addEdge(edges: [number, number][], a: number, b: number): void {
  if (a === b) return
  const lo = Math.min(a, b)
  const hi = Math.max(a, b)
  if (edges.some(([x, y]) => x === lo && y === hi)) return
  edges.push([lo, hi])
}

function pathSpan(stars: PathStar[]): number {
  let max = 0
  for (let i = 0; i < stars.length; i++) {
    for (let j = i + 1; j < stars.length; j++) {
      const d = Math.hypot(stars[i].x - stars[j].x, stars[i].y - stars[j].y)
      if (d > max) max = d
    }
  }
  return max
}

function assignSparkles(
  stars: PathStar[],
  edges: [number, number][],
  mainPathEnd: number,
  rng: SeededRandom,
): PathStar[] {
  const degree = new Map<number, number>()
  for (const [a, b] of edges) {
    degree.set(a, (degree.get(a) ?? 0) + 1)
    degree.set(b, (degree.get(b) ?? 0) + 1)
  }

  const sparkle = new Set<number>()
  sparkle.add(mainPathEnd)
  if (rng.next() < 0.28) sparkle.add(0)

  for (const [idx, deg] of degree) {
    if (deg >= 3) sparkle.add(idx)
  }

  for (let i = 1; i < mainPathEnd; i++) {
    if (sparkle.has(i)) continue
    const prev = stars[i - 1]
    const curr = stars[i]
    const next = stars[i + 1]
    const a1 = Math.atan2(curr.y - prev.y, curr.x - prev.x)
    const a2 = Math.atan2(next.y - curr.y, next.x - curr.x)
    let diff = Math.abs(a2 - a1)
    if (diff > Math.PI) diff = Math.PI * 2 - diff
    if (diff > 0.5 && rng.next() < 0.4) sparkle.add(i)
  }

  const maxSparkles = 3 + rng.nextInt(0, 1)
  if (sparkle.size > maxSparkles) {
    const removable = [...sparkle].filter((i) => i !== mainPathEnd)
    while (sparkle.size > maxSparkles && removable.length > 0) {
      const idx = removable.splice(rng.nextInt(0, removable.length - 1), 1)[0]
      sparkle.delete(idx)
    }
  }

  return stars.map((star, i) => ({ ...star, bright: sparkle.has(i) }))
}

function assignStarDepth(stars: PathStar[], rng: SeededRandom): PathStar[] {
  return stars.map((star) => ({
    ...star,
    opacity: star.bright ? 0.78 + rng.next() * 0.22 : 0.38 + rng.next() * 0.44,
    scale: star.bright ? 0.9 + rng.next() * 0.2 : 0.78 + rng.next() * 0.28,
    glow: star.bright ? 0.58 + rng.next() * 0.42 : 0.28 + rng.next() * 0.42,
  }))
}

/**
 * Landing designs sweep across the sky in a zigzag along one primary axis,
 * with occasional branches — not random blobs that fold back on themselves.
 */
function generateOrganicPath(rng: SeededRandom): { stars: PathStar[]; edges: [number, number][] } {
  const starCount = 9 + rng.nextInt(0, 3)
  const primary = rng.next() * Math.PI * 2
  const perp = primary + Math.PI / 2
  const stepAlong = 44 + rng.next() * 24
  const zigzagAmp = 32 + rng.next() * 22

  const stars: PathStar[] = [{ x: 0, y: 0, bright: false, opacity: 1, scale: 1, glow: 1 }]
  const edges: [number, number][] = []

  let along = 0
  let zig = 0
  let zigDir = rng.next() < 0.5 ? 1 : -1

  for (let i = 1; i < starCount; i++) {
    along += stepAlong + (rng.next() - 0.5) * 12
    if (rng.next() < 0.7) zigDir *= -1
    zig += zigDir * (zigzagAmp * (0.55 + rng.next() * 0.45))

    const x = Math.cos(primary) * along + Math.cos(perp) * zig
    const y = Math.sin(primary) * along + Math.sin(perp) * zig
    stars.push({ x, y, bright: false, opacity: 1, scale: 1, glow: 1 })
    addEdge(edges, i - 1, i)
  }

  const mainPathEnd = stars.length - 1

  if (rng.next() < 0.7) {
    const branchFrom = rng.nextInt(1, Math.max(1, mainPathEnd - 2))
    const branchBase = stars[branchFrom]
    let bAlong = 0
    let bZig = 0
    let prev = branchFrom
    const branchDir = perp + (rng.next() < 0.5 ? 0.55 : -0.55)
    const branchPerp = branchDir + Math.PI / 2

    const branchLen = 1 + rng.nextInt(0, 2)
    for (let b = 0; b < branchLen; b++) {
      bAlong += 36 + rng.next() * 22
      bZig += (rng.next() - 0.5) * 40
      const x = branchBase.x + Math.cos(branchDir) * bAlong + Math.cos(branchPerp) * bZig
      const y = branchBase.y + Math.sin(branchDir) * bAlong + Math.sin(branchPerp) * bZig
      const idx = stars.length
      stars.push({ x, y, bright: false, opacity: 1, scale: 1, glow: 1 })
      addEdge(edges, prev, idx)
      prev = idx
    }
  }

  if (rng.next() < 0.45) {
    const forkFrom = rng.nextInt(2, Math.max(2, mainPathEnd - 1))
    const base = stars[forkFrom]
    const forkAngle = primary + ((rng.next() < 0.5 ? 1 : -1) * (0.7 + rng.next() * 0.5))
    const dist = 38 + rng.next() * 30
    const idx = stars.length
    stars.push({
      x: base.x + Math.cos(forkAngle) * dist,
      y: base.y + Math.sin(forkAngle) * dist,
      bright: false,
      opacity: 1,
      scale: 1,
      glow: 1,
    })
    addEdge(edges, forkFrom, idx)
  }

  const sparkled = assignSparkles(stars, edges, mainPathEnd, rng)
  return { stars: assignStarDepth(sparkled, rng), edges }
}

function centerStars(stars: PathStar[]): PathStar[] {
  let cx = 0
  let cy = 0
  for (const s of stars) {
    cx += s.x
    cy += s.y
  }
  cx /= stars.length
  cy /= stars.length
  return stars.map((s) => ({ ...s, x: s.x - cx, y: s.y - cy }))
}

function ensureMinSpan(stars: PathStar[], minSpan: number): PathStar[] {
  const span = pathSpan(stars)
  if (span >= minSpan || span === 0) return stars
  const factor = minSpan / span
  return stars.map((s) => ({ ...s, x: s.x * factor, y: s.y * factor }))
}

export function generateConstellation(
  seed: number,
  palette: string,
): ConstellationGeometry {
  const rng = new SeededRandom(seed)
  const { stars: rawStars, edges } = generateOrganicPath(rng)

  const scale = 1.05 + rng.next() * 0.15
  const rotation = rng.next() * Math.PI * 2
  const cos = Math.cos(rotation)
  const sin = Math.sin(rotation)
  const flipX = rng.next() < 0.5 ? -1 : 1
  const flipY = rng.next() < 0.5 ? -1 : 1

  const centered = ensureMinSpan(centerStars(rawStars), 300)
  const stars = centered.map((star) => {
    const px = star.x * flipX * scale
    const py = star.y * flipY * scale
    return {
      x: px * cos - py * sin,
      y: px * sin + py * cos,
      bright: star.bright,
      opacity: star.opacity,
      scale: star.scale,
      glow: star.glow,
    }
  })

  const colours = getPaletteColours(palette)

  return {
    stars,
    edges,
    colour: DESIGN_GOLD,
    glowColour: colours.glowColour,
  }
}

export function generateFromWish(wish: string): ConstellationGeometry & { seed: number; palette: string } {
  const seed = hashWish(wish)
  const palette = deriveColourPalette(seed)
  return { ...generateConstellation(seed, palette), seed, palette }
}
