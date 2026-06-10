import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { deriveColourPalette, findEmptyPosition, hashWish } from '../_shared/hash.ts'
import { getSeedConstellationPositions } from '../_shared/seedConstellations.ts'
import {
  checkProfanity,
  checkLanguage,
  checkSubmissionOpenAIModeration,
  validateFirstNameFormat,
} from '../_shared/moderation/index.ts'
import { checkRateLimit, RateLimitError } from '../_shared/rateLimit.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { wish, name } = await req.json()

    if (!name || typeof name !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Please enter your first name.', code: 'moderation' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const trimmedName = name.trim()
    const nameFormat = validateFirstNameFormat(trimmedName)
    if (!nameFormat.approved) {
      return new Response(
        JSON.stringify({ error: nameFormat.reason ?? 'This name cannot be used.', code: 'moderation' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const nameProfanity = checkProfanity(trimmedName)
    if (!nameProfanity.approved) {
      return new Response(
        JSON.stringify({ error: 'This name contains language that cannot be used.', code: 'moderation' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (!wish || typeof wish !== 'string' || wish.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Please enter a wish.', code: 'moderation' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const trimmedWish = wish.trim()

    if (trimmedWish.length > 280) {
      return new Response(
        JSON.stringify({ error: 'Your wish is too long. Please keep it under 280 characters.', code: 'moderation' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const wishProfanity = checkProfanity(trimmedWish)
    if (!wishProfanity.approved) {
      return new Response(
        JSON.stringify({
          error: wishProfanity.reason ?? 'This wish cannot be added to the sky.',
          code: 'moderation',
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const language = checkLanguage(trimmedWish)
    if (!language.approved) {
      return new Response(
        JSON.stringify({
          error: language.reason ?? 'This wish cannot be added to the sky.',
          code: 'moderation',
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const clientIp = getClientIp(req)
    try {
      checkRateLimit(clientIp)
    } catch (err) {
      if (err instanceof RateLimitError) {
        return new Response(
          JSON.stringify({ error: err.message, code: 'rate_limit' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
      throw err
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const searchRadius = 2000
    const seed = hashWish(trimmedWish)
    const colour_palette = deriveColourPalette(seed)

    const [moderation, nearbyResult] = await Promise.all([
      checkSubmissionOpenAIModeration(trimmedName, trimmedWish),
      supabase
        .from('constellations')
        .select('x, y')
        .gte('x', -searchRadius)
        .lte('x', searchRadius)
        .gte('y', -searchRadius)
        .lte('y', searchRadius),
    ])

    if (!moderation.name.approved) {
      return new Response(
        JSON.stringify({
          error: moderation.name.reason ?? 'This name cannot be used.',
          code: 'moderation',
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const position = findEmptyPosition(
      [...(nearbyResult.data ?? []), ...getSeedConstellationPositions()],
      360,
      seed,
    )

    const { data: inserted, error: insertError } = await supabase
      .from('constellations')
      .insert({
        name: trimmedName,
        wish: trimmedWish,
        seed,
        x: position.x,
        y: position.y,
        colour_palette,
      })
      .select()
      .single()

    if (insertError) {
      return new Response(
        JSON.stringify({ error: 'Unable to place your wish in the sky.', code: 'placement' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({ constellation: inserted }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch {
    return new Response(
      JSON.stringify({ error: 'Something went wrong. Please try again.', code: 'server' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
