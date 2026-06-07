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

type Morphology = 'zigzag' | 'compact' | 'long' | 'arc' | 'wide' | 'cluster'

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

  const maxSparkles = 2 + rng.nextInt(0, 2)
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

function pickMorphology(rng: SeededRandom): Morphology {
  const morphs: Morphology[] = ['zigzag', 'compact', 'long', 'arc', 'wide', 'cluster']
  return morphs[rng.nextInt(0, morphs.length - 1)]
}

function generateZigzagPath(rng: SeededRandom): { stars: PathStar[]; edges: [number, number][] } {
  const starCount = 8 + rng.nextInt(0, 4)
  const primary = rng.next() * Math.PI * 2
  const perp = primary + Math.PI / 2
  const stepAlong = 40 + rng.next() * 28
  const zigzagAmp = 28 + rng.next() * 26

  const stars: PathStar[] = [{ x: 0, y: 0, bright: false, opacity: 1, scale: 1, glow: 1 }]
  const edges: [number, number][] = []

  let along = 0
  let zig = 0
  let zigDir = rng.next() < 0.5 ? 1 : -1

  for (let i = 1; i < starCount; i++) {
    along += stepAlong + (rng.next() - 0.5) * 14
    if (rng.next() < 0.7) zigDir *= -1
    zig += zigDir * (zigzagAmp * (0.55 + rng.next() * 0.45))

    const x = Math.cos(primary) * along + Math.cos(perp) * zig
    const y = Math.sin(primary) * along + Math.sin(perp) * zig
    stars.push({ x, y, bright: false, opacity: 1, scale: 1, glow: 1 })
    addEdge(edges, i - 1, i)
  }

  const mainPathEnd = stars.length - 1

  if (rng.next() < 0.65) {
    const branchFrom = rng.nextInt(1, Math.max(1, mainPathEnd - 2))
    const branchBase = stars[branchFrom]
    const branchDir = perp + (rng.next() < 0.5 ? 0.55 : -0.55)
    const branchPerp = branchDir + Math.PI / 2
    let prev = branchFrom
    const branchLen = 1 + rng.nextInt(0, 2)
    let bAlong = 0
    let bZig = 0
    for (let b = 0; b < branchLen; b++) {
      bAlong += 32 + rng.next() * 20
      bZig += (rng.next() - 0.5) * 36
      const x = branchBase.x + Math.cos(branchDir) * bAlong + Math.cos(branchPerp) * bZig
      const y = branchBase.y + Math.sin(branchDir) * bAlong + Math.sin(branchPerp) * bZig
      const idx = stars.length
      stars.push({ x, y, bright: false, opacity: 1, scale: 1, glow: 1 })
      addEdge(edges, prev, idx)
      prev = idx
    }
  }

  const sparkled = assignSparkles(stars, edges, mainPathEnd, rng)
  return { stars: assignStarDepth(sparkled, rng), edges }
}

function generateCompactPath(rng: SeededRandom): { stars: PathStar[]; edges: [number, number][] } {
  const starCount = 5 + rng.nextInt(0, 2)
  const angle = rng.next() * Math.PI * 2
  const step = 26 + rng.next() * 14

  const stars: PathStar[] = [{ x: 0, y: 0, bright: false, opacity: 1, scale: 1, glow: 1 }]
  const edges: [number, number][] = []

  for (let i = 1; i < starCount; i++) {
    const turn = (rng.next() - 0.5) * 0.9
    const dist = step * (0.75 + rng.next() * 0.4)
    const x = stars[i - 1].x + Math.cos(angle + turn * i) * dist
    const y = stars[i - 1].y + Math.sin(angle + turn * i) * dist
    stars.push({ x, y, bright: false, opacity: 1, scale: 1, glow: 1 })
    addEdge(edges, i - 1, i)
  }

  const sparkled = assignSparkles(stars, edges, stars.length - 1, rng)
  return { stars: assignStarDepth(sparkled, rng), edges }
}

function generateLongPath(rng: SeededRandom): { stars: PathStar[]; edges: [number, number][] } {
  const starCount = 13 + rng.nextInt(0, 5)
  const primary = rng.next() * Math.PI * 2
  const stepAlong = 52 + rng.next() * 22
  const drift = (rng.next() - 0.5) * 0.12

  const stars: PathStar[] = [{ x: 0, y: 0, bright: false, opacity: 1, scale: 1, glow: 1 }]
  const edges: [number, number][] = []
  let along = 0
  let lateral = 0

  for (let i = 1; i < starCount; i++) {
    along += stepAlong + (rng.next() - 0.5) * 16
    lateral += (rng.next() - 0.5) * 38
    const x = Math.cos(primary + drift * i) * along + Math.cos(primary + Math.PI / 2) * lateral
    const y = Math.sin(primary + drift * i) * along + Math.sin(primary + Math.PI / 2) * lateral
    stars.push({ x, y, bright: false, opacity: 1, scale: 1, glow: 1 })
    addEdge(edges, i - 1, i)
  }

  const sparkled = assignSparkles(stars, edges, stars.length - 1, rng)
  return { stars: assignStarDepth(sparkled, rng), edges }
}

function generateArcPath(rng: SeededRandom): { stars: PathStar[]; edges: [number, number][] } {
  const starCount = 7 + rng.nextInt(0, 4)
  const radius = 120 + rng.next() * 90
  const startAngle = rng.next() * Math.PI * 2
  const sweep = (0.55 + rng.next() * 0.85) * Math.PI * (rng.next() < 0.5 ? 1 : -1)

  const stars: PathStar[] = []
  const edges: [number, number][] = []

  for (let i = 0; i < starCount; i++) {
    const t = starCount === 1 ? 0 : i / (starCount - 1)
    const a = startAngle + sweep * t
    const wobble = (rng.next() - 0.5) * 18
    stars.push({
      x: Math.cos(a) * (radius + wobble),
      y: Math.sin(a) * (radius + wobble),
      bright: false,
      opacity: 1,
      scale: 1,
      glow: 1,
    })
    if (i > 0) addEdge(edges, i - 1, i)
  }

  const sparkled = assignSparkles(stars, edges, stars.length - 1, rng)
  return { stars: assignStarDepth(sparkled, rng), edges }
}

function generateWidePath(rng: SeededRandom): { stars: PathStar[]; edges: [number, number][] } {
  const starCount = 9 + rng.nextInt(0, 3)
  const primary = rng.next() * Math.PI * 2
  const perp = primary + Math.PI / 2
  const stepAlong = 34 + rng.next() * 16
  const wideAmp = 58 + rng.next() * 42

  const stars: PathStar[] = [{ x: 0, y: 0, bright: false, opacity: 1, scale: 1, glow: 1 }]
  const edges: [number, number][] = []
  let along = 0

  for (let i = 1; i < starCount; i++) {
    along += stepAlong
    const side = i % 2 === 0 ? 1 : -1
    const x = Math.cos(primary) * along + Math.cos(perp) * side * wideAmp * (0.65 + rng.next() * 0.35)
    const y = Math.sin(primary) * along + Math.sin(perp) * side * wideAmp * (0.65 + rng.next() * 0.35)
    stars.push({ x, y, bright: false, opacity: 1, scale: 1, glow: 1 })
    addEdge(edges, i - 1, i)
  }

  const sparkled = assignSparkles(stars, edges, stars.length - 1, rng)
  return { stars: assignStarDepth(sparkled, rng), edges }
}

function generateClusterPath(rng: SeededRandom): { stars: PathStar[]; edges: [number, number][] } {
  const armCount = 3 + rng.nextInt(0, 2)
  const stars: PathStar[] = [{ x: 0, y: 0, bright: true, opacity: 1, scale: 1, glow: 1 }]
  const edges: [number, number][] = []

  for (let arm = 0; arm < armCount; arm++) {
    const angle = (arm / armCount) * Math.PI * 2 + rng.next() * 0.5
    const armLen = 2 + rng.nextInt(0, 2)
    let prev = 0
    let dist = 38 + rng.next() * 22

    for (let i = 0; i < armLen; i++) {
      dist += 30 + rng.next() * 24
      const wobble = (rng.next() - 0.5) * 20
      const x = Math.cos(angle) * dist + wobble
      const y = Math.sin(angle) * dist + wobble * 0.6
      const idx = stars.length
      stars.push({ x, y, bright: false, opacity: 1, scale: 1, glow: 1 })
      addEdge(edges, prev, idx)
      prev = idx
    }
  }

  const sparkled = assignSparkles(stars, edges, 0, rng)
  return { stars: assignStarDepth(sparkled, rng), edges }
}

function generatePath(
  morph: Morphology,
  rng: SeededRandom,
): { stars: PathStar[]; edges: [number, number][] } {
  switch (morph) {
    case 'compact':
      return generateCompactPath(rng)
    case 'long':
      return generateLongPath(rng)
    case 'arc':
      return generateArcPath(rng)
    case 'wide':
      return generateWidePath(rng)
    case 'cluster':
      return generateClusterPath(rng)
    default:
      return generateZigzagPath(rng)
  }
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

function morphologyScale(morph: Morphology, rng: SeededRandom): { scale: number; minSpan: number } {
  switch (morph) {
    case 'compact':
      return { scale: 0.48 + rng.next() * 0.22, minSpan: 120 + rng.nextInt(0, 50) }
    case 'long':
      return { scale: 1.05 + rng.next() * 0.45, minSpan: 360 + rng.nextInt(0, 100) }
    case 'arc':
      return { scale: 0.72 + rng.next() * 0.38, minSpan: 200 + rng.nextInt(0, 80) }
    case 'wide':
      return { scale: 0.85 + rng.next() * 0.35, minSpan: 280 + rng.nextInt(0, 90) }
    case 'cluster':
      return { scale: 0.55 + rng.next() * 0.3, minSpan: 150 + rng.nextInt(0, 60) }
    default:
      return { scale: 0.75 + rng.next() * 0.55, minSpan: 240 + rng.nextInt(0, 90) }
  }
}

export function generateConstellation(
  seed: number,
  palette: string,
): ConstellationGeometry {
  const rng = new SeededRandom(seed)
  const morph = pickMorphology(rng)
  const { stars: rawStars, edges } = generatePath(morph, rng)

  const { scale, minSpan } = morphologyScale(morph, rng)
  const rotation = rng.next() * Math.PI * 2
  const cos = Math.cos(rotation)
  const sin = Math.sin(rotation)
  const flipX = rng.next() < 0.5 ? -1 : 1
  const flipY = rng.next() < 0.5 ? -1 : 1

  const centered = ensureMinSpan(centerStars(rawStars), minSpan)
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
