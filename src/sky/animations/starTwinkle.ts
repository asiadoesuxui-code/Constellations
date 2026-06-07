import type { Sprite } from 'pixi.js'

export interface TwinkleStar {
  sprite: Sprite
  glow: Sprite
  baseSpriteAlpha: number
  baseGlowAlpha: number
  baseSpriteWidth: number
  baseSpriteHeight: number
  baseGlowWidth: number
  baseGlowHeight: number
  bright: boolean
  phase: number
}

export interface StarTwinkleState {
  stars: TwinkleStar[]
  startMs: number
  revealWeight: number
  settleFromReveal: boolean
}

export interface TwinkleSample {
  alpha: number
  scale: number
}

const SETTLE_DURATION_MS = 2800

export function createStarPhase(x: number, y: number): number {
  return x * 0.017 + y * 0.013
}

export function buildTwinkleStar(
  sprite: Sprite,
  glow: Sprite,
  bright: boolean,
  baseSpriteAlpha: number,
  phase: number,
): TwinkleStar {
  return {
    sprite,
    glow,
    baseSpriteAlpha,
    baseGlowAlpha: glow.alpha,
    baseSpriteWidth: sprite.width,
    baseSpriteHeight: sprite.height,
    baseGlowWidth: glow.width,
    baseGlowHeight: glow.height,
    bright,
    phase,
  }
}

export function sampleTwinkle(
  elapsedMs: number,
  phase: number,
  bright: boolean,
  revealWeight: number,
): TwinkleSample {
  const t = elapsedMs * 0.001
  const speed = bright ? 3.6 : 2.2
  const wave = Math.sin(t * speed + phase)

  const dramaticAlphaAmp = bright ? 0.32 : 0.14
  const subtleAlphaAmp = bright ? 0.18 : 0.08
  const alphaAmp = subtleAlphaAmp + (dramaticAlphaAmp - subtleAlphaAmp) * revealWeight

  const dramaticScaleAmp = bright ? 0.16 : 0
  const subtleScaleAmp = bright ? 0.09 : 0
  const scaleAmp = subtleScaleAmp + (dramaticScaleAmp - subtleScaleAmp) * revealWeight

  return {
    alpha: 1 + alphaAmp * wave,
    scale: bright ? 1 + scaleAmp * wave : 1,
  }
}

export function createStarTwinkleState(
  stars: TwinkleStar[],
  startMs: number,
  fromReveal: boolean,
): StarTwinkleState {
  return {
    stars,
    startMs,
    revealWeight: fromReveal ? 1 : 0,
    settleFromReveal: fromReveal,
  }
}

function applyTwinkleToStar(star: TwinkleStar, sample: TwinkleSample, reveal = 1): void {
  const alphaFactor = sample.alpha * reveal
  star.sprite.alpha = star.baseSpriteAlpha * alphaFactor
  star.glow.alpha = star.baseGlowAlpha * alphaFactor

  const sizeFactor = (star.bright ? sample.scale : 1) * reveal
  star.sprite.width = star.baseSpriteWidth * sizeFactor
  star.sprite.height = star.baseSpriteHeight * sizeFactor
  star.glow.width = star.baseGlowWidth * sizeFactor
  star.glow.height = star.baseGlowHeight * sizeFactor
}

export function applyStarTwinkle(
  state: StarTwinkleState,
  nowMs: number,
  deltaMs: number,
  revealFactors?: number[],
): void {
  if (state.settleFromReveal && state.revealWeight > 0) {
    state.revealWeight = Math.max(0, state.revealWeight - deltaMs / SETTLE_DURATION_MS)
  }

  const elapsed = nowMs - state.startMs
  state.stars.forEach((star, i) => {
    const reveal = revealFactors?.[i] ?? 1
    const sample = sampleTwinkle(elapsed, star.phase, star.bright, state.revealWeight)
    applyTwinkleToStar(star, sample, reveal)
  })
}
