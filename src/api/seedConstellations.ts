import type { ConstellationRecord } from '../types/contracts'
import { deriveColourPalette, hashWish } from '../sky/generation/hashSeed'
import { SeededRandom } from '../sky/generation/seededRandom'
import { CONSTELLATION_MIN_DISTANCE, findEmptyPosition, type Position } from './placement'

interface SeedEntry {
  name: string
  wish: string
}

const SEED_ENTRIES: SeedEntry[] = [
  { name: 'Maya', wish: 'my family stays healthy and happy' },
  { name: 'Lucas', wish: 'I could travel and see the ocean again' },
  { name: 'Sofia', wish: 'for more kindness in the world' },
  { name: 'Noah', wish: 'my little brother finds true friends' },
  { name: 'Aisha', wish: 'I could do skating' },
  { name: 'Emil', wish: 'for peaceful mornings and quiet evenings' },
  { name: 'Lena', wish: 'my grandmother feels the sunlight again' },
  { name: 'Omar', wish: 'courage for everyone starting over' },
  { name: 'Clara', wish: 'the lonely know they are not alone' },
  { name: 'Finn', wish: 'love outlasts every hard season' },
  { name: 'Yuki', wish: 'we remember to look up together' },
  { name: 'Priya', wish: 'healing for all who are still hurting' },
  { name: 'Marco', wish: 'my city becomes softer and safer' },
  { name: 'Hana', wish: 'I can learn piano one day' },
  { name: 'Leo', wish: 'for stars to guide lost hearts home' },
  { name: 'Ines', wish: 'my parents find rest after so many years' },
  { name: 'Raj', wish: 'every child has a warm place to sleep' },
  { name: 'Elena', wish: 'I could speak without fear' },
  { name: 'Theo', wish: 'for gardens to grow in forgotten places' },
  { name: 'Amira', wish: 'my friends never stop laughing' },
  { name: 'Jonas', wish: 'the world grows quieter and gentler' },
  { name: 'Mei', wish: 'I find work that feels meaningful' },
  { name: 'Diego', wish: 'for second chances to be real' },
  { name: 'Nina', wish: 'my sister passes her exams' },
  { name: 'Kai', wish: 'snow again at home this winter' },
  { name: 'Zara', wish: 'for patience when everything feels slow' },
  { name: 'Ivan', wish: 'I could hug my friend far away' },
  { name: 'Freya', wish: 'mornings that feel gentle again' },
  { name: 'Sam', wish: 'for art to keep people hopeful' },
  { name: 'Rosa', wish: 'my heart feels light after grief' },
  { name: 'Tariq', wish: 'safe journeys for everyone I love' },
  { name: 'Vera', wish: 'I can keep the promises I make' },
  { name: 'Hugo', wish: 'for old friendships to find their way back' },
  { name: 'Laila', wish: 'the night sky never feels empty' },
  { name: 'Oscar', wish: 'I could build something beautiful' },
  { name: 'Anya', wish: 'for hope in every small town' },
]

/** Soft sky patch centered on the camera — visible when zoomed out. */
const PATCH_RADIUS = 2800
const CANDIDATE_ATTEMPTS = 160

const QUADRANT_ANGLE_RANGES: [number, number][] = [
  [-Math.PI / 2, 0],
  [0, Math.PI / 2],
  [Math.PI / 2, Math.PI],
  [Math.PI, Math.PI * 1.5],
]

function distance(a: Position, b: Position): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function isValidPosition(candidate: Position, existing: Position[]): boolean {
  return existing.every((p) => distance(candidate, p) >= CONSTELLATION_MIN_DISTANCE)
}

function quadrantIndex(position: Position): number {
  if (position.x >= 0 && position.y < 0) return 0
  if (position.x >= 0 && position.y >= 0) return 1
  if (position.x < 0 && position.y >= 0) return 2
  return 3
}

function pickBalancedQuadrant(existing: Position[], rng: SeededRandom): number {
  const counts = [0, 0, 0, 0]
  for (const position of existing) {
    counts[quadrantIndex(position)]++
  }

  const minCount = Math.min(...counts)
  const candidates = counts
    .map((count, index) => (count === minCount ? index : -1))
    .filter((index) => index >= 0)
  return candidates[rng.nextInt(0, candidates.length - 1)]
}

function randomPatchPoint(rng: SeededRandom, quadrant: number): Position {
  const [start, end] = QUADRANT_ANGLE_RANGES[quadrant]
  const angle = start + rng.next() * (end - start)
  const t = Math.sqrt(rng.next())
  const wobble = 220 + rng.next() * 360
  return {
    x: Math.cos(angle) * PATCH_RADIUS * t + (rng.next() - 0.5) * wobble,
    y: Math.sin(angle) * PATCH_RADIUS * t + (rng.next() - 0.5) * wobble,
  }
}

function pickNaturalPosition(index: number, wish: string, existing: Position[]): Position {
  const seed = hashWish(wish) + index * 31_337
  const rng = new SeededRandom(seed)
  const quadrant = pickBalancedQuadrant(existing, rng)
  const valid: Position[] = []

  for (let attempt = 0; attempt < CANDIDATE_ATTEMPTS; attempt++) {
    const candidate = randomPatchPoint(rng, quadrant)
    if (!isValidPosition(candidate, existing)) continue

    valid.push(candidate)
    if (rng.next() < 0.42) return candidate
  }

  if (valid.length > 0) {
    return valid[rng.nextInt(0, valid.length - 1)]
  }

  return findEmptyPosition(
    existing,
    CONSTELLATION_MIN_DISTANCE,
    seed + 17_903,
    randomPatchPoint(rng, quadrant),
  )
}

function buildSeedConstellations(): ConstellationRecord[] {
  const positions: Position[] = []
  const records: ConstellationRecord[] = []

  for (let i = 0; i < SEED_ENTRIES.length; i++) {
    const entry = SEED_ENTRIES[i]
    const seed = hashWish(entry.wish)
    const pos = pickNaturalPosition(i, entry.wish, positions)

    positions.push(pos)
    records.push({
      id: `seed-${i.toString().padStart(2, '0')}-${seed.toString(16)}`,
      created_at: '2020-01-01T00:00:00.000Z',
      name: entry.name,
      wish: entry.wish,
      seed,
      x: pos.x,
      y: pos.y,
      colour_palette: deriveColourPalette(seed),
    })
  }

  return records
}

const SEED_CONSTELLATIONS = buildSeedConstellations()

/** Ambient demo constellations shown alongside persisted wishes when Supabase is configured. */
export const AMBIENT_SEED_COUNT = 10

function pickSeedSubset(records: ConstellationRecord[], limit: number): ConstellationRecord[] {
  if (limit >= records.length) return records
  const step = records.length / limit
  const picked: ConstellationRecord[] = []
  for (let i = 0; i < limit; i++) {
    picked.push(records[Math.floor(i * step)])
  }
  return picked
}

export function getSeedConstellations(limit?: number): ConstellationRecord[] {
  if (limit === undefined) return SEED_CONSTELLATIONS
  return pickSeedSubset(SEED_CONSTELLATIONS, limit)
}

export function getSeedConstellationPositions(limit?: number): Position[] {
  return getSeedConstellations(limit).map(({ x, y }) => ({ x, y }))
}

export function isSeedConstellationId(id: string): boolean {
  return id.startsWith('seed-')
}
