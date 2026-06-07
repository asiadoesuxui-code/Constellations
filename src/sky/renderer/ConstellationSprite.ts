import { Container, Graphics } from 'pixi.js'
import type { ConstellationGeometry, ConstellationRecord } from '../../types/contracts'
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

  const lines = new Graphics()
  drawConstellationLines(
    lines,
    geometry.stars,
    geometry.edges,
    geometry.colour,
    isOwn ? 0.95 : 0.62,
    isOwn ? 2.8 : 2.1,
  )
  container.addChild(lines)

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

  const twinkle = createStarTwinkleState(
    twinkleStars,
    options.twinkleStartMs ?? performance.now(),
    options.twinkleFromReveal ?? false,
  )

  return {
    container,
    record,
    hitRadius: envelopeRadius(geometry.stars),
    alpha: 1,
    renderable: true,
    twinkle,
  }
}

export function updateConstellationTwinkle(
  visual: ConstellationVisual,
  nowMs: number,
  deltaMs: number,
): void {
  if (!visual.twinkle) return
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
