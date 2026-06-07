export interface ConstellationRecord {
  id: string
  created_at: string
  wish: string
  seed: number
  x: number
  y: number
  colour_palette: 'warm' | 'cool' | 'peach' | 'violet'
}

export interface ConstellationGeometry {
  stars: { x: number; y: number; bright: boolean; opacity: number; scale: number; glow: number }[]
  edges: [number, number][]
  colour: string
  glowColour: string
}

export interface BoundingBox {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export interface ModerationResult {
  allowed: boolean
  reason?: string
  failedCheck?: 'profanity' | 'language' | 'openai'
}

export interface SubmitWishResponse {
  constellation: ConstellationRecord
}

export interface SubmitWishError {
  error: string
  code: 'moderation' | 'rate_limit' | 'placement' | 'server'
}

export type SkyViewMode = 'landing' | 'exploring'

export interface SkyCanvasRef {
  panTo(x: number, y: number, durationMs?: number): Promise<void>
  revealConstellation(record: ConstellationRecord): Promise<void>
  placeNewConstellation(wish: string, x: number, y: number): Promise<void>
  loadConstellationsFromData(constellations: ConstellationRecord[]): void
  addConstellation(record: ConstellationRecord): void
  setHighlightedId(id: string | null): void
  setViewMode(mode: SkyViewMode): void
  setOnHover(
    callback: (wish: string | null, screenX: number, screenY: number) => void,
  ): void
  getCameraPosition(): { x: number; y: number; zoom: number }
  worldToScreen(x: number, y: number): { x: number; y: number }
  getConstellationPositions(): { x: number; y: number }[]
}

export type ColourPalette = ConstellationRecord['colour_palette']
