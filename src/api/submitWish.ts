import {
  fetchNearbyPositions,
  insertConstellation,
} from './constellations'
import { CONSTELLATION_MIN_DISTANCE, findEmptyPosition } from './placement'
import { getSeedConstellationPositions } from './seedConstellations'
import { RateLimitError, rateLimiter } from './rateLimit'
import {
  checkProfanity,
  checkLanguage,
  checkSubmissionOpenAIModeration,
  validateFirstNameFormat,
} from '../moderation'
import { isSupabaseConfigured } from '../lib/supabase/client'
import { hashWish, deriveColourPalette } from '../sky/generation/hashSeed'
import type { ConstellationRecord, SubmitWishError, SubmitWishResponse } from '../types/contracts'

const SEARCH_RADIUS = 2000
const RATE_LIMIT_KEY = 'browser'

export async function submitWish(
  wish: string,
  name: string,
  existingPositions: { x: number; y: number }[] = [],
): Promise<SubmitWishResponse | SubmitWishError> {
  const trimmedWish = wish.trim()
  const trimmedName = name.trim()

  const nameFormat = validateFirstNameFormat(trimmedName)
  if (!nameFormat.approved) {
    return {
      error: nameFormat.reason ?? 'This name cannot be used.',
      code: 'moderation',
    }
  }

  const nameProfanity = checkProfanity(trimmedName)
  if (!nameProfanity.approved) {
    return {
      error: 'This name contains language that cannot be used.',
      code: 'moderation',
    }
  }

  if (!trimmedWish) {
    return { error: 'Please enter a wish.', code: 'moderation' }
  }

  if (trimmedWish.length > 280) {
    return {
      error: 'Your wish is too long. Please keep it under 280 characters.',
      code: 'moderation',
    }
  }

  const wishProfanity = checkProfanity(trimmedWish)
  if (!wishProfanity.approved) {
    return {
      error: wishProfanity.reason ?? 'This wish cannot be added to the sky.',
      code: 'moderation',
    }
  }

  const language = checkLanguage(trimmedWish)
  if (!language.approved) {
    return {
      error: language.reason ?? 'This wish cannot be added to the sky.',
      code: 'moderation',
    }
  }

  const seed = hashWish(trimmedWish)
  const colour_palette = deriveColourPalette(seed)

  const positionsPromise = isSupabaseConfigured()
    ? fetchNearbyPositions(0, 0, SEARCH_RADIUS)
    : Promise.resolve(existingPositions)

  try {
    const [moderation, nearbyPositions] = await Promise.all([
      checkSubmissionOpenAIModeration(trimmedName, trimmedWish),
      positionsPromise,
    ])

    if (!moderation.name.approved) {
      return {
        error: moderation.name.reason ?? 'This name cannot be used.',
        code: 'moderation',
      }
    }

    const occupied = isSupabaseConfigured()
      ? nearbyPositions
      : [...nearbyPositions, ...getSeedConstellationPositions()]

    const position = findEmptyPosition(occupied, CONSTELLATION_MIN_DISTANCE, seed)

    try {
      rateLimiter.check(RATE_LIMIT_KEY)
    } catch (err) {
      if (err instanceof RateLimitError) {
        return { error: err.message, code: 'rate_limit' }
      }
      throw err
    }

    if (isSupabaseConfigured()) {
      const constellation = await insertConstellation(
        trimmedName,
        trimmedWish,
        seed,
        position.x,
        position.y,
        colour_palette,
      )
      rateLimiter.record(RATE_LIMIT_KEY)
      return { constellation }
    }

    const constellation: ConstellationRecord = {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      name: trimmedName,
      wish: trimmedWish,
      seed,
      x: position.x,
      y: position.y,
      colour_palette,
    }
    rateLimiter.record(RATE_LIMIT_KEY)
    return { constellation }
  } catch (err) {
    console.error('[submitWish] placement failed:', err)
    return {
      error: isSupabaseConfigured()
        ? 'Unable to place your wish in the sky.'
        : 'Something went wrong. Please try again.',
      code: isSupabaseConfigured() ? 'placement' : 'server',
    }
  }
}
