import { BlurFilter, Container, Graphics } from 'pixi.js'
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
import {
  getConstellationLineStyle,
  OWN_CONSTELLATION_SCALE,
  preloadConstellationAssets,
} from './constellationAssets'
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

/** World-space Y offset from constellation center to label anchor (negative = above). */
function computeLabelAnchorY(stars: ConstellationGeometry['stars'], isOwn: boolean): number {
  const scale = isOwn ? OWN_CONSTELLATION_SCALE : 1
  let top = 0
  for (const star of stars) {
    const halo = (star.bright ? 50 : 34) * star.scale * scale
    top = Math.min(top, star.y * scale - halo)
  }
  return top - (isOwn ? 4 : 8)
}

const LABEL_FADE_MS = 520

export interface ConstellationVisual {
  container: Container
  record: ConstellationRecord
  hitRadius: number
  labelAnchorY: number
  showLabel: boolean
  labelRevealStartMs: number | null
  alpha: number
  renderable: boolean
  twinkle?: StarTwinkleState
  reveal?: ConstellationRevealState
}

export function getLabelDisplayOpacity(visual: ConstellationVisual, nowMs: number): number {
  if (!visual.showLabel) return 0
  const base = visual.alpha
  if (visual.labelRevealStartMs == null) return base
  const t = Math.min((nowMs - visual.labelRevealStartMs) / LABEL_FADE_MS, 1)
  const eased = 1 - (1 - t) ** 3
  return base * eased
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
    container.scale.set(OWN_CONSTELLATION_SCALE)
  }

  const lineStyle = getConstellationLineStyle(isOwn)
  const animateReveal = options.animateReveal ?? false
  const linesGlow = new Graphics()
  linesGlow.filters = [new BlurFilter({ strength: lineStyle.glowBlur })]
  linesGlow.blendMode = 'screen'
  const lines = new Graphics()
  lines.filters = [new BlurFilter({ strength: lineStyle.coreBlur })]
  container.addChild(linesGlow)
  container.addChild(lines)
  if (!animateReveal) {
    drawConstellationLines(lines, geometry.stars, geometry.edges, lineStyle, linesGlow)
  }

  const starOpacityBoost = isOwn ? 1.35 : 1
  const starScaleBoost = isOwn ? 1.28 : 1
  const starGlowBoost = isOwn ? 1.48 : 0.9

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
        linesGlow,
        lineStyle,
        startMs,
        complete: false,
        onComplete: options.onRevealComplete,
      }
    : undefined

  return {
    container,
    record,
    hitRadius: envelopeRadius(geometry.stars) * (isOwn ? OWN_CONSTELLATION_SCALE : 1),
    labelAnchorY: computeLabelAnchorY(geometry.stars, isOwn),
    showLabel: !animateReveal,
    labelRevealStartMs: null,
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
    const done = updateConstellationReveal(visual.reveal, visual.twinkle, nowMs)
    if (done) {
      visual.showLabel = true
      visual.labelRevealStartMs = nowMs
    }
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
