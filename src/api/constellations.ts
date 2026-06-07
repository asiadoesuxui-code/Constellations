import type { ConstellationRecord } from '../types/contracts'
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase/client'
import type { ConstellationRow } from '../lib/supabase/database.types'

function rowToRecord(row: ConstellationRow): ConstellationRecord {
  return {
    id: row.id,
    created_at: row.created_at,
    name: row.name ?? '',
    wish: row.wish,
    seed: Number(row.seed),
    x: row.x,
    y: row.y,
    colour_palette: (row.colour_palette ?? 'warm') as ConstellationRecord['colour_palette'],
  }
}

function distanceFrom(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x1 - x2
  const dy = y1 - y2
  return Math.sqrt(dx * dx + dy * dy)
}

export async function getConstellations(
  centerX: number,
  centerY: number,
  radius: number,
): Promise<ConstellationRecord[]> {
  if (!isSupabaseConfigured()) return []

  const { data, error } = await getSupabaseClient()
    .from('constellations')
    .select('*')
    .gte('x', centerX - radius)
    .lte('x', centerX + radius)
    .gte('y', centerY - radius)
    .lte('y', centerY + radius)

  if (error) throw error

  return (data ?? [])
    .filter((row) => distanceFrom(centerX, centerY, row.x, row.y) <= radius)
    .map(rowToRecord)
}

export async function insertConstellation(
  name: string,
  wish: string,
  seed: number,
  x: number,
  y: number,
  colourPalette: string,
): Promise<ConstellationRecord> {
  if (!isSupabaseConfigured()) {
    throw new Error('Cannot insert constellation: Supabase is not configured')
  }

  const { data, error } = await getSupabaseClient()
    .from('constellations')
    .insert({
      name,
      wish,
      seed,
      x,
      y,
      colour_palette: colourPalette,
    })
    .select()
    .single()

  if (error) throw error
  return rowToRecord(data)
}

export function subscribeToNewConstellations(
  callback: (record: ConstellationRecord) => void,
): () => void {
  if (!isSupabaseConfigured()) return () => {}

  const supabase = getSupabaseClient()
  const channel = supabase
    .channel('constellations-inserts')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'constellations' },
      (payload) => {
        callback(rowToRecord(payload.new as ConstellationRow))
      },
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

/** @deprecated Use getConstellations with bounds center/radius instead */
export async function fetchConstellationsInBounds(bounds: {
  minX: number
  maxX: number
  minY: number
  maxY: number
}): Promise<ConstellationRecord[]> {
  const centerX = (bounds.minX + bounds.maxX) / 2
  const centerY = (bounds.minY + bounds.maxY) / 2
  const radius = Math.hypot(bounds.maxX - centerX, bounds.maxY - centerY)
  return getConstellations(centerX, centerY, radius)
}

/** @deprecated Use subscribeToNewConstellations */
export const subscribeToInserts = subscribeToNewConstellations

export async function fetchNearbyPositions(
  centerX: number,
  centerY: number,
  radius: number,
): Promise<{ x: number; y: number }[]> {
  const records = await getConstellations(centerX, centerY, radius)
  return records.map(({ x, y }) => ({ x, y }))
}
