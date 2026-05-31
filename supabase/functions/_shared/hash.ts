export type ColourPalette = 'warm' | 'cool' | 'peach' | 'violet'

export function hashWish(text: string): number {
  let hash = 2166136261
  const normalized = text.trim().toLowerCase()
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function deriveColourPalette(seed: number): ColourPalette {
  const palettes: ColourPalette[] = ['warm', 'cool', 'peach', 'violet']
  return palettes[seed % palettes.length]
}

export interface Position {
  x: number
  y: number
}

const DEFAULT_MIN_DISTANCE = 90
const MAX_ATTEMPTS = 50

function distance(a: Position, b: Position): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

export function findEmptyPosition(
  existingPositions: Position[],
  minDistance = DEFAULT_MIN_DISTANCE,
  seed = 0,
): Position {
  let radius = 100 + (seed % 200)

  for (let ring = 0; ring < 20; ring++) {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const angle = ((seed + attempt * 137.5 + ring * 47.3) % 360) * (Math.PI / 180)
      const r = radius + ring * 120 + (attempt % 10) * 15
      const candidate = {
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r,
      }
      if (existingPositions.every((p) => distance(candidate, p) >= minDistance)) {
        return candidate
      }
    }
    radius += 80
  }

  const fallbackAngle = (seed % 360) * (Math.PI / 180)
  const fallbackR = radius + existingPositions.length * minDistance
  return {
    x: Math.cos(fallbackAngle) * fallbackR,
    y: Math.sin(fallbackAngle) * fallbackR,
  }
}

/** @deprecated Use findEmptyPosition */
export const findNonOverlappingPosition = (
  existing: Position[],
  seed: number,
): Position => findEmptyPosition(existing, DEFAULT_MIN_DISTANCE, seed)
