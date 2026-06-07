import type { ConstellationRecord } from '../types/contracts'
import { deriveColourPalette, hashWish } from '../sky/generation/hashSeed'
import { CONSTELLATION_MIN_DISTANCE, findEmptyPosition, type Position } from './placement'

const DEMO_WISHES = [
  'I wish for peace in every heart',
  'I wish my grandmother feels the sunlight again',
  'I wish kindness finds those who need it most',
  'I wish the lonely know they are not alone',
  'I wish for mornings that feel gentle',
  'I wish courage for everyone starting over',
  'I wish the world grows quieter and softer',
  'I wish love outlasts every hard season',
  'I wish healing for all who are still hurting',
  'I wish we remember to look up together',
]

export function generateDemoConstellations(
  centerX = 0,
  centerY = 0,
  existing: Position[] = [],
): ConstellationRecord[] {
  const positions: Position[] = [...existing]
  const records: ConstellationRecord[] = []

  for (const wish of DEMO_WISHES) {
    const seed = hashWish(wish)
    const relative = findEmptyPosition(
      positions.map((p) => ({ x: p.x - centerX, y: p.y - centerY })),
      CONSTELLATION_MIN_DISTANCE,
      seed,
    )
    const pos = { x: centerX + relative.x, y: centerY + relative.y }
    positions.push(pos)
    records.push({
      id: `demo-${seed.toString(16)}`,
      created_at: new Date().toISOString(),
      wish,
      seed,
      x: pos.x,
      y: pos.y,
      colour_palette: deriveColourPalette(seed),
    })
  }

  return records
}
