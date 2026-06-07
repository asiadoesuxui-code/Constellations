import type { ConstellationGeometry } from '../../types/contracts'
import { getPaletteColours } from './colourPalettes'
import { deriveColourPalette, hashWish } from './hashSeed'
import { SeededRandom } from './seededRandom'

export { hashWish, deriveColourPalette } from './hashSeed'

const LINE_GOLD = '#D1BCA0'

const MIN_SPAN = 150
const MAX_SPAN = 280
const MAX_ASPECT_RATIO = 2.35
const MAX_EDGE_LENGTH = 105

interface PathStar {
  x: number
  y: number
  bright: boolean
  opacity: number
  scale: number
  glow: number
}

type Archetype =
  | 'dipper'
  | 'cassiopeia'
  | 'cross'
  | 'orion'
  | 'sickle'
  | 'crown'
  | 'kite'
  | 'triangle'
  | 'twins'
  | 'diamond'
  | 'serpent'
  | 'arrow'

type OrganicStyle =
  | 'zigzag'
  | 'compact'
  | 'organic_arc'
  | 'meander'
  | 'short_fork'
  | 'wide_s'
  | 'asymmetric_cluster'

type ShapeStyle = Archetype | OrganicStyle

/** Interleave archetypes and organics so picks alternate families. */
const ALL_STYLES: ShapeStyle[] = [
  'zigzag',
  'dipper',
  'meander',
  'cassiopeia',
  'organic_arc',
  'wide_s',
  'compact',
  'cross',
  'short_fork',
  'orion',
  'asymmetric_cluster',
  'sickle',
  'kite',
  'crown',
  'triangle',
  'twins',
  'diamond',
  'serpent',
  'arrow',
]

const ORGANIC_STYLES: OrganicStyle[] = [
  'zigzag',
  'meander',
  'organic_arc',
  'wide_s',
  'compact',
  'short_fork',
  'asymmetric_cluster',
]

const ARCHETYPE_STYLES: Archetype[] = [
  'dipper',
  'cassiopeia',
  'cross',
  'orion',
  'sickle',
  'kite',
  'crown',
  'triangle',
  'twins',
  'diamond',
  'serpent',
  'arrow',
]

function makeStar(x: number, y: number): PathStar {
  return { x, y, bright: false, opacity: 1, scale: 1, glow: 1 }
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

function maxEdgeLength(stars: PathStar[], edges: [number, number][]): number {
  let max = 0
  for (const [a, b] of edges) {
    max = Math.max(max, Math.hypot(stars[a].x - stars[b].x, stars[a].y - stars[b].y))
  }
  return max
}

function assignSparkles(
  stars: PathStar[],
  edges: [number, number][],
  accentIndices: number[],
  rng: SeededRandom,
): PathStar[] {
  const degree = new Map<number, number>()
  for (const [a, b] of edges) {
    degree.set(a, (degree.get(a) ?? 0) + 1)
    degree.set(b, (degree.get(b) ?? 0) + 1)
  }

  const sparkle = new Set<number>()
  for (const idx of accentIndices) sparkle.add(idx)

  for (const [idx, deg] of degree) {
    if (deg >= 3) sparkle.add(idx)
  }

  const maxSparkles = 2 + rng.nextInt(0, 2)
  if (sparkle.size > maxSparkles) {
    const removable = [...sparkle].filter((i) => !accentIndices.includes(i))
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

function jitter(value: number, rng: SeededRandom, amount: number): number {
  return value + (rng.next() - 0.5) * amount
}

function finalizePath(
  stars: PathStar[],
  edges: [number, number][],
  rng: SeededRandom,
  accentIndices: number[],
): { stars: PathStar[]; edges: [number, number][] } {
  let scaled = stars
  const longest = maxEdgeLength(scaled, edges)
  if (longest > MAX_EDGE_LENGTH) {
    const factor = MAX_EDGE_LENGTH / longest
    scaled = scaled.map((s) => ({ ...s, x: s.x * factor, y: s.y * factor }))
  }

  const sparkled = assignSparkles(scaled, edges, accentIndices, rng)
  return { stars: assignStarDepth(sparkled, rng), edges }
}

function buildFromTemplate(
  points: [number, number][],
  edgePairs: [number, number][],
  rng: SeededRandom,
  accentIndices: number[],
  jitterAmount = 12,
): { stars: PathStar[]; edges: [number, number][] } {
  const stars = points.map(([x, y]) =>
    makeStar(jitter(x, rng, jitterAmount), jitter(y, rng, jitterAmount)),
  )
  const edges: [number, number][] = []
  for (const [a, b] of edgePairs) addEdge(edges, a, b)
  return finalizePath(stars, edges, rng, accentIndices)
}

function scaleUnit(rng: SeededRandom): number {
  return 44 + rng.next() * 18
}

function generateDipper(rng: SeededRandom, flip: number) {
  const s = scaleUnit(rng)
  const f = flip
  return buildFromTemplate(
    [
      [-s * 0.9 * f, -s * 0.25],
      [s * 0.15 * f, -s * 0.45],
      [s * 0.75 * f, s * 0.1],
      [-s * 0.1 * f, s * 0.55],
      [-s * 0.55 * f, s * 0.95],
      [-s * 1.05 * f, s * 1.35],
      [-s * 1.2 * f, s * 1.75],
    ],
    [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6]],
    rng,
    [2, 6],
    14,
  )
}

function generateCassiopeia(rng: SeededRandom, flip: number) {
  const s = scaleUnit(rng)
  const f = flip
  return buildFromTemplate(
    [
      [-s * 1.1 * f, s * 0.15],
      [-s * 0.45 * f, -s * 0.55],
      [0, s * 0.35],
      [s * 0.5 * f, -s * 0.4],
      [s * 1.05 * f, s * 0.2],
    ],
    [[0, 1], [1, 2], [2, 3], [3, 4]],
    rng,
    [2],
    13,
  )
}

function generateCross(rng: SeededRandom, flip: number) {
  const s = scaleUnit(rng)
  const f = flip
  const armTilt = (rng.next() - 0.5) * 0.35
  return buildFromTemplate(
    [
      [0, -s * 1.0],
      [0, -s * 0.3],
      [0, s * 0.32],
      [-s * 0.5 * f, s * 0.38 + armTilt * s],
      [s * 0.38 * f, s * 0.48 - armTilt * s * 0.6],
      [0, s * 0.95],
    ],
    [[0, 1], [1, 2], [2, 5], [2, 3], [2, 4]],
    rng,
    [2, 5],
    11,
  )
}

function generateOrion(rng: SeededRandom, flip: number) {
  const s = scaleUnit(rng)
  const f = flip
  return buildFromTemplate(
    [
      [-s * 0.85 * f, s * 0.55],
      [s * 0.75 * f, s * 0.6],
      [-s * 0.42 * f, 0],
      [0, 0],
      [s * 0.4 * f, 0],
      [0, -s * 0.55],
      [-s * 0.28 * f, -s * 0.95],
      [s * 0.22 * f, -s * 0.9],
    ],
    [[0, 2], [2, 3], [3, 4], [4, 1], [3, 5], [5, 6], [5, 7]],
    rng,
    [3, 0, 4],
    12,
  )
}

function generateSickle(rng: SeededRandom, flip: number) {
  const s = scaleUnit(rng)
  const f = flip
  return buildFromTemplate(
    [
      [s * 0.9 * f, -s * 0.7],
      [s * 0.55 * f, -s * 0.15],
      [s * 0.15 * f, s * 0.25],
      [-s * 0.2 * f, s * 0.55],
      [-s * 0.55 * f, s * 0.35],
      [-s * 0.85 * f, s * 0.05],
    ],
    [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]],
    rng,
    [0, 2],
    13,
  )
}

function generateCrown(rng: SeededRandom, flip: number) {
  const s = scaleUnit(rng)
  const f = flip
  const arc = 0.75 + rng.next() * 0.35
  return buildFromTemplate(
    [
      [-s * 1.0 * f, -s * 0.15],
      [-s * 0.55 * f, s * 0.45 * arc],
      [-s * 0.1 * f, s * 0.65 * arc],
      [s * 0.35 * f, s * 0.5 * arc],
      [s * 0.75 * f, s * 0.15],
      [s * 1.0 * f, -s * 0.25],
    ],
    [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]],
    rng,
    [2, 3],
    12,
  )
}

function generateKite(rng: SeededRandom, flip: number) {
  const s = scaleUnit(rng)
  const f = flip
  return buildFromTemplate(
    [
      [0, s * 0.95],
      [-s * 0.55 * f, s * 0.15],
      [s * 0.5 * f, s * 0.2],
      [-s * 0.35 * f, -s * 0.55],
      [s * 0.3 * f, -s * 0.5],
      [0, -s * 1.0],
    ],
    [[0, 1], [0, 2], [1, 3], [2, 4], [3, 4], [3, 5], [4, 5]],
    rng,
    [0, 5],
    11,
  )
}

function generateTriangle(rng: SeededRandom, flip: number) {
  const s = scaleUnit(rng)
  const f = flip
  return buildFromTemplate(
    [
      [0, s * 0.75],
      [-s * 0.8 * f, -s * 0.45],
      [s * 0.75 * f, -s * 0.4],
      [s * 0.15 * f, -s * 0.95],
    ],
    [[0, 1], [1, 2], [2, 0], [1, 3]],
    rng,
    [0],
    10,
  )
}

function generateTwins(rng: SeededRandom, flip: number) {
  const s = scaleUnit(rng)
  const gap = 0.42 + rng.next() * 0.12
  const f = flip
  return buildFromTemplate(
    [
      [-s * gap * f, s * 0.8],
      [-s * gap * f, s * 0.2],
      [-s * gap * f, -s * 0.35],
      [-s * gap * f, -s * 0.85],
      [s * gap * f, s * 0.75],
      [s * gap * f, s * 0.15],
      [s * gap * f, -s * 0.4],
      [s * gap * f, -s * 0.8],
    ],
    [[0, 1], [1, 2], [2, 3], [4, 5], [5, 6], [6, 7], [1, 5]],
    rng,
    [0, 4],
    10,
  )
}

function generateDiamond(rng: SeededRandom, flip: number) {
  const s = scaleUnit(rng)
  const f = flip
  const skew = (rng.next() - 0.5) * 0.25
  return buildFromTemplate(
    [
      [0, s * 0.85],
      [-s * 0.55 * f, skew * s],
      [s * 0.5 * f, skew * s * 0.8],
      [0, -s * 0.8],
      [0, -s * 1.15],
    ],
    [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4]],
    rng,
    [0],
    9,
  )
}

function generateSerpent(rng: SeededRandom, flip: number) {
  const s = scaleUnit(rng)
  const f = flip
  return buildFromTemplate(
    [
      [-s * 1.0 * f, s * 0.55],
      [-s * 0.65 * f, s * 0.2],
      [-s * 0.25 * f, -s * 0.05],
      [s * 0.1 * f, -s * 0.25],
      [s * 0.45 * f, -s * 0.55],
      [s * 0.72 * f, -s * 0.88],
      [s * 0.9 * f, -s * 1.2],
    ],
    [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]],
    rng,
    [0, 6],
    13,
  )
}

function generateArrow(rng: SeededRandom, flip: number) {
  const s = scaleUnit(rng)
  const f = flip
  return buildFromTemplate(
    [
      [-s * 0.75 * f, -s * 0.35],
      [0, s * 0.65],
      [s * 0.7 * f, -s * 0.3],
      [0, -s * 0.85],
      [0, -s * 1.15],
    ],
    [[0, 1], [1, 2], [0, 3], [2, 3], [3, 4]],
    rng,
    [1],
    10,
  )
}

/** Organic zigzag — winding chain with optional multi-star branch. */
function generateZigzag(rng: SeededRandom) {
  const starCount = 7 + rng.nextInt(0, 4)
  const primary = rng.next() * Math.PI * 2
  const perp = primary + Math.PI / 2
  const stepAlong = 32 + rng.next() * 18
  const zigzagAmp = 26 + rng.next() * 22

  const stars: PathStar[] = [makeStar(0, 0)]
  const edges: [number, number][] = []
  let along = 0
  let zig = 0
  let zigDir = rng.next() < 0.5 ? 1 : -1

  for (let i = 1; i < starCount; i++) {
    along += stepAlong + (rng.next() - 0.5) * 12
    if (rng.next() < 0.7) zigDir *= -1
    zig += zigDir * zigzagAmp * (0.55 + rng.next() * 0.45)
    stars.push(
      makeStar(
        jitter(Math.cos(primary) * along + Math.cos(perp) * zig, rng, 11),
        jitter(Math.sin(primary) * along + Math.sin(perp) * zig, rng, 11),
      ),
    )
    addEdge(edges, i - 1, i)
  }

  const mainPathEnd = stars.length - 1
  if (rng.next() < 0.68) {
    const branchFrom = rng.nextInt(1, Math.max(1, mainPathEnd - 2))
    const base = stars[branchFrom]
    const branchDir = perp + (rng.next() < 0.5 ? 0.55 : -0.55)
    const branchPerp = branchDir + Math.PI / 2
    let prev = branchFrom
    const branchLen = 1 + rng.nextInt(0, 2)
    let bAlong = 0
    let bZig = 0
    for (let b = 0; b < branchLen; b++) {
      bAlong += 28 + rng.next() * 16
      bZig += (rng.next() - 0.5) * 28
      const idx = stars.length
      stars.push(
        makeStar(
          jitter(base.x + Math.cos(branchDir) * bAlong + Math.cos(branchPerp) * bZig, rng, 9),
          jitter(base.y + Math.sin(branchDir) * bAlong + Math.sin(branchPerp) * bZig, rng, 9),
        ),
      )
      addEdge(edges, prev, idx)
      prev = idx
    }
  }

  return finalizePath(stars, edges, rng, [mainPathEnd])
}

/** Small tight wandering path. */
function generateCompact(rng: SeededRandom) {
  const starCount = 5 + rng.nextInt(0, 2)
  const angle = rng.next() * Math.PI * 2
  const step = 24 + rng.next() * 12
  const stars: PathStar[] = [makeStar(0, 0)]
  const edges: [number, number][] = []

  for (let i = 1; i < starCount; i++) {
    const turn = (rng.next() - 0.5) * 1.1
    const dist = step * (0.7 + rng.next() * 0.45)
    stars.push(
      makeStar(
        jitter(stars[i - 1].x + Math.cos(angle + turn * i) * dist, rng, 9),
        jitter(stars[i - 1].y + Math.sin(angle + turn * i) * dist, rng, 9),
      ),
    )
    addEdge(edges, i - 1, i)
  }

  return finalizePath(stars, edges, rng, [stars.length - 1])
}

/** Partial arc — curved string of stars. */
function generateOrganicArc(rng: SeededRandom) {
  const starCount = 5 + rng.nextInt(0, 3)
  const radius = 65 + rng.next() * 45
  const startAngle = rng.next() * Math.PI * 2
  const sweep = (0.45 + rng.next() * 0.75) * Math.PI * (rng.next() < 0.5 ? 1 : -1)
  const stars: PathStar[] = []
  const edges: [number, number][] = []

  for (let i = 0; i < starCount; i++) {
    const t = starCount === 1 ? 0 : i / (starCount - 1)
    const a = startAngle + sweep * t
    stars.push(
      makeStar(
        jitter(Math.cos(a) * radius, rng, 10),
        jitter(Math.sin(a) * radius, rng, 10),
      ),
    )
    if (i > 0) addEdge(edges, i - 1, i)
  }

  return finalizePath(stars, edges, rng, [Math.floor(starCount / 2)])
}

/** Gentle meander — softer turns than zigzag. */
function generateMeander(rng: SeededRandom) {
  const starCount = 7 + rng.nextInt(0, 2)
  const heading = rng.next() * Math.PI * 2
  const stars: PathStar[] = [makeStar(0, 0)]
  const edges: [number, number][] = []
  let dir = heading

  for (let i = 1; i < starCount; i++) {
    dir += (rng.next() - 0.5) * 0.75
    const dist = 28 + rng.next() * 18
    stars.push(
      makeStar(
        jitter(stars[i - 1].x + Math.cos(dir) * dist, rng, 11),
        jitter(stars[i - 1].y + Math.sin(dir) * dist, rng, 11),
      ),
    )
    addEdge(edges, i - 1, i)
  }

  return finalizePath(stars, edges, rng, [rng.nextInt(1, starCount - 1)])
}

/** Main chain with a single short fork — never a full X. */
function generateShortFork(rng: SeededRandom) {
  const chainLen = 5 + rng.nextInt(0, 2)
  const heading = rng.next() * Math.PI * 2
  const stars: PathStar[] = [makeStar(0, 0)]
  const edges: [number, number][] = []
  let dir = heading

  for (let i = 1; i < chainLen; i++) {
    dir += (rng.next() - 0.5) * 0.35
    const dist = 30 + rng.next() * 14
    stars.push(
      makeStar(
        jitter(stars[i - 1].x + Math.cos(dir) * dist, rng, 9),
        jitter(stars[i - 1].y + Math.sin(dir) * dist, rng, 9),
      ),
    )
    addEdge(edges, i - 1, i)
  }

  const forkAt = rng.nextInt(1, chainLen - 2)
  const base = stars[forkAt]
  const forkDir = dir + (rng.next() < 0.5 ? 1.1 : -1.1)
  const forkDist = 32 + rng.next() * 20
  const forkIdx = stars.length
  stars.push(
    makeStar(
      jitter(base.x + Math.cos(forkDir) * forkDist, rng, 8),
      jitter(base.y + Math.sin(forkDir) * forkDist, rng, 8),
    ),
  )
  addEdge(edges, forkAt, forkIdx)

  if (rng.next() < 0.5) {
    const tip = stars[forkIdx]
    const tipDir = forkDir + (rng.next() - 0.5) * 0.5
    const tipIdx = stars.length
    stars.push(
      makeStar(
        jitter(tip.x + Math.cos(tipDir) * (24 + rng.next() * 14), rng, 7),
        jitter(tip.y + Math.sin(tipDir) * (24 + rng.next() * 14), rng, 7),
      ),
    )
    addEdge(edges, forkIdx, tipIdx)
  }

  return finalizePath(stars, edges, rng, [forkAt, forkIdx])
}

/** Alternating wide S-curve — old "wide" morphology, kept compact. */
function generateWideS(rng: SeededRandom) {
  const starCount = 7 + rng.nextInt(0, 3)
  const primary = rng.next() * Math.PI * 2
  const perp = primary + Math.PI / 2
  const stepAlong = 28 + rng.next() * 14
  const wideAmp = 32 + rng.next() * 24

  const stars: PathStar[] = [makeStar(0, 0)]
  const edges: [number, number][] = []
  let along = 0

  for (let i = 1; i < starCount; i++) {
    along += stepAlong + (rng.next() - 0.5) * 8
    const side = i % 2 === 0 ? 1 : -1
    stars.push(
      makeStar(
        jitter(
          Math.cos(primary) * along + Math.cos(perp) * side * wideAmp * (0.65 + rng.next() * 0.35),
          rng,
          10,
        ),
        jitter(
          Math.sin(primary) * along + Math.sin(perp) * side * wideAmp * (0.65 + rng.next() * 0.35),
          rng,
          10,
        ),
      ),
    )
    addEdge(edges, i - 1, i)
  }

  return finalizePath(stars, edges, rng, [Math.floor(starCount / 2)])
}

/** Uneven arms from a hub — not radially symmetric, avoids X silhouettes. */
function generateAsymmetricCluster(rng: SeededRandom) {
  const armCount = 2 + rng.nextInt(0, 1)
  const stars: PathStar[] = [makeStar(0, 0)]
  const edges: [number, number][] = []
  const baseAngle = rng.next() * Math.PI * 2
  const usedAngles: number[] = []

  for (let arm = 0; arm < armCount; arm++) {
    let angle = baseAngle + arm * (Math.PI * 0.55 + rng.next() * 0.4) + (rng.next() - 0.5) * 0.35
    for (const prev of usedAngles) {
      let diff = Math.abs(angle - prev)
      if (diff > Math.PI) diff = Math.PI * 2 - diff
      if (diff < Math.PI * 0.45) angle += Math.PI * 0.5
    }
    usedAngles.push(angle)

    const armLen = 2 + rng.nextInt(0, 2)
    let prev = 0
    let dist = 30 + rng.next() * 18
    let dir = angle

    for (let i = 0; i < armLen; i++) {
      dir += (rng.next() - 0.5) * 0.4
      dist += 26 + rng.next() * 16
      const idx = stars.length
      stars.push(
        makeStar(
          jitter(Math.cos(dir) * dist, rng, 10),
          jitter(Math.sin(dir) * dist, rng, 10),
        ),
      )
      addEdge(edges, prev, idx)
      prev = idx
    }
  }

  return finalizePath(stars, edges, rng, [0])
}

function pickStyle(seed: number, rng: SeededRandom): ShapeStyle {
  const preferOrganic = seed % 5 !== 0
  const pool = preferOrganic ? ORGANIC_STYLES : ARCHETYPE_STYLES
  return pool[(seed + rng.nextInt(0, pool.length - 1)) % pool.length]
}

function generateStyle(
  style: ShapeStyle,
  rng: SeededRandom,
): { stars: PathStar[]; edges: [number, number][] } {
  const flip = rng.next() < 0.5 ? 1 : -1
  switch (style) {
    case 'dipper':
      return generateDipper(rng, flip)
    case 'cassiopeia':
      return generateCassiopeia(rng, flip)
    case 'cross':
      return generateCross(rng, flip)
    case 'orion':
      return generateOrion(rng, flip)
    case 'sickle':
      return generateSickle(rng, flip)
    case 'crown':
      return generateCrown(rng, flip)
    case 'kite':
      return generateKite(rng, flip)
    case 'triangle':
      return generateTriangle(rng, flip)
    case 'twins':
      return generateTwins(rng, flip)
    case 'diamond':
      return generateDiamond(rng, flip)
    case 'serpent':
      return generateSerpent(rng, flip)
    case 'arrow':
      return generateArrow(rng, flip)
    case 'zigzag':
      return generateZigzag(rng)
    case 'compact':
      return generateCompact(rng)
    case 'organic_arc':
      return generateOrganicArc(rng)
    case 'meander':
      return generateMeander(rng)
    case 'short_fork':
      return generateShortFork(rng)
    case 'wide_s':
      return generateWideS(rng)
    case 'asymmetric_cluster':
      return generateAsymmetricCluster(rng)
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

function clampSpan(stars: PathStar[], minSpan: number, maxSpan: number): PathStar[] {
  const span = pathSpan(stars)
  if (span === 0) return stars
  if (span < minSpan) {
    const factor = minSpan / span
    return stars.map((s) => ({ ...s, x: s.x * factor, y: s.y * factor }))
  }
  if (span > maxSpan) {
    const factor = maxSpan / span
    return stars.map((s) => ({ ...s, x: s.x * factor, y: s.y * factor }))
  }
  return stars
}

function normalizeShape(stars: PathStar[]): PathStar[] {
  let result = stars
  for (let pass = 0; pass < 2; pass++) {
    result = clampSpan(result, MIN_SPAN, MAX_SPAN)
    result = clampAspectRatio(result, MAX_ASPECT_RATIO)
  }
  return clampSpan(result, MIN_SPAN, MAX_SPAN)
}

function clampAspectRatio(stars: PathStar[], maxRatio: number): PathStar[] {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const s of stars) {
    minX = Math.min(minX, s.x)
    maxX = Math.max(maxX, s.x)
    minY = Math.min(minY, s.y)
    maxY = Math.max(maxY, s.y)
  }
  const w = maxX - minX
  const h = maxY - minY
  if (w === 0 || h === 0) return stars

  const ratio = Math.max(w, h) / Math.min(w, h)
  if (ratio <= maxRatio) return stars

  if (w > h) {
    const factor = (h * maxRatio) / w
    return stars.map((s) => ({ ...s, x: s.x * factor }))
  }
  const factor = (w * maxRatio) / h
  return stars.map((s) => ({ ...s, y: s.y * factor }))
}

export function shapeSignature(geometry: ConstellationGeometry): string {
  const coords = geometry.stars
    .map((s) => `${Math.round(s.x / 8)},${Math.round(s.y / 8)}`)
    .sort()
    .join('|')
  const edgeSig = geometry.edges
    .map(([a, b]) => `${Math.min(a, b)}-${Math.max(a, b)}`)
    .sort()
    .join('|')
  return `${geometry.stars.length}:${coords}::${edgeSig}`
}

export function generateConstellation(
  seed: number,
  palette: string,
): ConstellationGeometry {
  const rng = new SeededRandom(seed)
  const style = pickStyle(seed, rng)
  const { stars: rawStars, edges } = generateStyle(style, rng)

  const sizeScale = 0.78 + rng.next() * 0.34
  const rotation = rng.next() * Math.PI * 2
  const cos = Math.cos(rotation)
  const sin = Math.sin(rotation)
  const flipX = rng.next() < 0.5 ? -1 : 1
  const flipY = rng.next() < 0.5 ? -1 : 1

  const transformed = centerStars(rawStars).map((star) => {
    const px = star.x * flipX * sizeScale
    const py = star.y * flipY * sizeScale
    return {
      ...star,
      x: px * cos - py * sin,
      y: px * sin + py * cos,
    }
  })

  const stars = normalizeShape(transformed)

  const colours = getPaletteColours(palette)

  return {
    stars,
    edges,
    colour: LINE_GOLD,
    glowColour: colours.glowColour,
  }
}

export function generateFromWish(wish: string): ConstellationGeometry & { seed: number; palette: string } {
  const seed = hashWish(wish)
  const palette = deriveColourPalette(seed)
  return { ...generateConstellation(seed, palette), seed, palette }
}
