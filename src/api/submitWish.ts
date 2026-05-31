import {
  fetchNearbyPositions,
  insertConstellation,
} from './constellations'
import { findEmptyPosition } from './placement'
import { RateLimitError, rateLimiter } from './rateLimit'
import { moderateWish } from '../moderation'
import { isSupabaseConfigured } from '../lib/supabase/client'
import { hashWish, deriveColourPalette } from '../sky/generation/hashSeed'
import type { ConstellationRecord, SubmitWishError, SubmitWishResponse } from '../types/contracts'

const SEARCH_RADIUS = 2000
const RATE_LIMIT_KEY = 'browser'

export async function submitWish(
  wish: string,
  existingPositions: { x: number; y: number }[] = [],
): Promise<SubmitWishResponse | SubmitWishError> {
  const trimmed = wish.trim()

  if (!trimmed) {
    return { error: 'Please enter a wish.', code: 'moderation' }
  }

  if (trimmed.length > 280) {
    return {
      error: 'Your wish is too long. Please keep it under 280 characters.',
      code: 'moderation',
    }
  }

  try {
    rateLimiter.enforce(RATE_LIMIT_KEY)
  } catch (err) {
    if (err instanceof RateLimitError) {
      return { error: err.message, code: 'rate_limit' }
    }
    throw err
  }

  const moderation = await moderateWish(trimmed)
  if (!moderation.allowed) {
    return {
      error: moderation.reason ?? 'This wish cannot be added to the sky.',
      code: 'moderation',
    }
  }

  const seed = hashWish(trimmed)
  const colour_palette = deriveColourPalette(seed)

  try {
    const nearby = isSupabaseConfigured()
      ? await fetchNearbyPositions(0, 0, SEARCH_RADIUS)
      : existingPositions

    const position = findEmptyPosition(nearby, 90, seed)

    if (isSupabaseConfigured()) {
      const constellation = await insertConstellation(
        trimmed,
        seed,
        position.x,
        position.y,
        colour_palette,
      )
      return { constellation }
    }

    const constellation: ConstellationRecord = {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      wish: trimmed,
      seed,
      x: position.x,
      y: position.y,
      colour_palette,
    }
    return { constellation }
  } catch {
    return {
      error: isSupabaseConfigured()
        ? 'Unable to place your wish in the sky.'
        : 'Something went wrong. Please try again.',
      code: isSupabaseConfigured() ? 'placement' : 'server',
    }
  }
}
