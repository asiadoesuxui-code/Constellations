import { Container, Graphics } from 'pixi.js'
import type { ConstellationGeometry, ConstellationRecord } from '../../types/contracts'
import {
  updateConstellationReveal,
  type ConstellationRevealState,
} from '../animations/constellationReveal'
import {
  applyStarTwinkle,
  buildTwinkleStar,
  createStarPhase,
  createStarTwinkleState,
  type StarTwinkleState,
} from '../animations/starTwinkle'
import { generateConstellation } from '../generation/generateConstellation'
import { preloadConstellationAssets } from './constellationAssets'
import { addStarGraphics, drawConstellationLines } from './drawStars'

export interface CreateConstellationOptions {
  twinkleStartMs?: number
  twinkleFromReveal?: boolean
  animateReveal?: boolean
  onRevealComplete?: () => void
  isOwn?: boolean
}

function envelopeRadius(stars: ConstellationGeometry['stars']): number {
  let max = 30
  for (const star of stars) {
    const r = Math.hypot(star.x, star.y)
    if (r > max) max = r
  }
  return max + 25
}

export interface ConstellationVisual {
  container: Container
  record: ConstellationRecord
  hitRadius: number
  alpha: number
  renderable: boolean
  twinkle?: StarTwinkleState
  reveal?: ConstellationRevealState
}

export async function createConstellationSprite(
  record: ConstellationRecord,
  options: CreateConstellationOptions = {},
): Promise<ConstellationVisual> {
  await preloadConstellationAssets()
  const geometry = generateConstellation(record.seed, record.colour_palette)
  const isOwn = options.isOwn ?? false
  const container = new Container()
  container.x = record.x
  container.y = record.y
  container.label = record.id
  if (isOwn) {
    container.scale.set(1.1)
  }

  const lineAlpha = isOwn ? 0.95 : 0.62
  const lineWidth = isOwn ? 2.8 : 2.1
  const animateReveal = options.animateReveal ?? false
  const lines = new Graphics()
  container.addChild(lines)
  if (!animateReveal) {
    drawConstellationLines(lines, geometry.stars, geometry.edges, geometry.colour, lineAlpha, lineWidth)
  }

  const starOpacityBoost = isOwn ? 1.25 : 1.02
  const starScaleBoost = isOwn ? 1.18 : 1.04
  const starGlowBoost = isOwn ? 1.35 : 0.95

  const twinkleStars = []
  for (const star of geometry.stars) {
    const { sprite, glow } = addStarGraphics(
      container,
      star.x,
      star.y,
      star.bright,
      Math.min(1, star.opacity * starOpacityBoost),
      star.scale * starScaleBoost,
      star.glow * starGlowBoost,
    )
    twinkleStars.push(
      buildTwinkleStar(sprite, glow, star.bright, star.opacity, createStarPhase(star.x, star.y)),
    )
  }

  const startMs = options.twinkleStartMs ?? performance.now()
  const twinkle = createStarTwinkleState(twinkleStars, startMs, options.twinkleFromReveal ?? false)

  const reveal: ConstellationRevealState | undefined = animateReveal
    ? {
        geometry,
        lines,
        lineAlpha,
        lineWidth,
        startMs,
        complete: false,
        onComplete: options.onRevealComplete,
      }
    : undefined

  return {
    container,
    record,
    hitRadius: envelopeRadius(geometry.stars),
    alpha: 1,
    renderable: true,
    twinkle,
    reveal,
  }
}

export function updateConstellationTwinkle(
  visual: ConstellationVisual,
  nowMs: number,
  deltaMs: number,
): void {
  if (!visual.twinkle) return
  if (visual.reveal && !visual.reveal.complete) {
    updateConstellationReveal(visual.reveal, visual.twinkle, nowMs)
    return
  }
  applyStarTwinkle(visual.twinkle, nowMs, deltaMs)
}

export function updateConstellationAlpha(visual: ConstellationVisual, alpha: number): void {
  visual.alpha = alpha
  visual.container.alpha = alpha
}

export function setConstellationRenderable(visual: ConstellationVisual, renderable: boolean): void {
  visual.renderable = renderable
  visual.container.renderable = renderable
  visual.container.visible = renderable
}
