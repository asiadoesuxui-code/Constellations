export interface Position {
  x: number
  y: number
}

/** Minimum center-to-center gap; constellations span ~300px in world space. */
export const CONSTELLATION_MIN_DISTANCE = 360

const DEFAULT_MIN_DISTANCE = CONSTELLATION_MIN_DISTANCE
const MAX_ATTEMPTS = 50

function distance(a: Position, b: Position): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

function isValidPosition(
  candidate: Position,
  existing: Position[],
  minDistance: number,
): boolean {
  return existing.every((p) => distance(candidate, p) >= minDistance)
}

export function findEmptyPosition(
  existingPositions: Position[],
  minDistance = DEFAULT_MIN_DISTANCE,
  seed = 0,
  origin: Position = { x: 0, y: 0 },
): Position {
  let radius = 100 + (seed % 200)

  for (let ring = 0; ring < 20; ring++) {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const angle = ((seed + attempt * 137.5 + ring * 47.3) % 360) * (Math.PI / 180)
      const r = radius + ring * 120 + (attempt % 10) * 15
      const candidate = {
        x: origin.x + Math.cos(angle) * r,
        y: origin.y + Math.sin(angle) * r,
      }
      if (isValidPosition(candidate, existingPositions, minDistance)) {
        return candidate
      }
    }
    radius += 80
  }

  const fallbackAngle = (seed % 360) * (Math.PI / 180)
  const fallbackR = radius + existingPositions.length * minDistance
  return {
    x: origin.x + Math.cos(fallbackAngle) * fallbackR,
    y: origin.y + Math.sin(fallbackAngle) * fallbackR,
  }
}

/** @deprecated Use findEmptyPosition */
export function findNonOverlappingPosition(
  existing: Position[],
  seed: number,
): Position {
  return findEmptyPosition(existing, DEFAULT_MIN_DISTANCE, seed)
}

export function recordToPosition(record: { x: number; y: number }): Position {
  return { x: record.x, y: record.y }
}
