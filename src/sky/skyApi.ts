import type { ConstellationRecord } from '../types/contracts'
import { deriveColourPalette, hashWish } from './generation/hashSeed'
import type { PixiSkyRenderer } from './renderer/PixiSkyRenderer'

/** Constellation payload from the database or demo data. */
export type ConstellationData = ConstellationRecord

export type ConstellationHoverCallback = (
  wish: string | null,
  screenX: number,
  screenY: number,
) => void

export function recordFromWish(
  wish: string,
  x: number,
  y: number,
  id?: string,
): ConstellationRecord {
  const seed = hashWish(wish)
  return {
    id: id ?? `local-${seed.toString(16)}-${Date.now()}`,
    created_at: new Date().toISOString(),
    wish,
    seed,
    x,
    y,
    colour_palette: deriveColourPalette(seed),
  }
}

/** Generates a constellation from wish text, animates placement, and pans the camera. */
export async function placeNewConstellation(
  renderer: PixiSkyRenderer,
  wish: string,
  x: number,
  y: number,
): Promise<void> {
  const record = recordFromWish(wish, x, y)
  await renderer.revealConstellation(record)
}

/** Loads existing constellation records into the sky without placement animation. */
export function loadConstellationsFromData(
  renderer: PixiSkyRenderer,
  constellations: ConstellationData[],
): void {
  for (const record of constellations) {
    void renderer.addConstellation(record)
  }
}

export function toRecordHoverHandler(
  onHover: ConstellationHoverCallback | undefined,
): (
  record: ConstellationRecord | null,
  screenX: number,
  screenY: number,
) => void {
  return (record, screenX, screenY) => {
    onHover?.(record?.wish ?? null, screenX, screenY)
  }
}
