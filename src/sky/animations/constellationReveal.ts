import { Graphics } from 'pixi.js'
import type { ConstellationGeometry } from '../../types/contracts'
import type { ConstellationLineStyle } from '../renderer/constellationAssets'
import { drawConstellationLinesProgress } from '../renderer/drawStars'
import { applyStarTwinkle, type StarRevealModifiers, type StarTwinkleState } from './starTwinkle'

export const REVEAL_LINE_STAGGER_MS = 260
export const REVEAL_LINE_DURATION_MS = 1050
export const REVEAL_ENV_RESTORE_MS = 1100

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2
}

export function getEdgeProgress(elapsedMs: number, edgeCount: number): number[] {
  return Array.from({ length: edgeCount }, (_, i) => {
    const lineElapsed = elapsedMs - i * REVEAL_LINE_STAGGER_MS
    if (lineElapsed < 0) return 0
    return easeInOutSine(Math.min(lineElapsed / REVEAL_LINE_DURATION_MS, 1))
  })
}

export function getStarRevealFromEdges(
  edges: [number, number][],
  edgeProgress: number[],
  starCount: number,
): StarRevealModifiers[] {
  const reveals = Array.from({ length: starCount }, () => ({ reveal: 0, ignitionScale: 1 }))

  edges.forEach(([a, b], i) => {
    const t = edgeProgress[i] ?? 0
    if (t <= 0) return

    const originReveal = easeInOutSine(Math.min(t / 0.5, 1))
    const destReveal = easeInOutSine(Math.max(0, (t - 0.12) / 0.88))

    reveals[a].reveal = Math.max(reveals[a].reveal, originReveal)
    reveals[b].reveal = Math.max(reveals[b].reveal, destReveal)
  })

  return reveals
}

export function getRevealTotalDuration(_starCount: number, edgeCount: number): number {
  if (edgeCount === 0) return 0
  return (edgeCount - 1) * REVEAL_LINE_STAGGER_MS + REVEAL_LINE_DURATION_MS
}

/** Ambient/nebula dim multiplier during reveal (1 = normal, lower = dimmer). */
export function getRevealEnvironmentDim(elapsedMs: number): number {
  const fadeIn = Math.min(elapsedMs / 700, 1)
  return 1 - easeOutCubic(fadeIn) * 0.16
}

export function getRevealEnvironmentRestoreMultiplier(
  restoreStartMs: number,
  nowMs: number,
): number {
  const elapsed = nowMs - restoreStartMs
  const t = Math.min(elapsed / REVEAL_ENV_RESTORE_MS, 1)
  const eased = easeOutCubic(t)
  return 0.84 + eased * 0.16
}

export interface ConstellationRevealState {
  geometry: ConstellationGeometry
  lines: Graphics
  linesGlow: Graphics
  lineStyle: ConstellationLineStyle
  startMs: number
  complete: boolean
  onComplete?: () => void
}

export function updateConstellationReveal(
  reveal: ConstellationRevealState,
  twinkle: StarTwinkleState,
  nowMs: number,
): boolean {
  const elapsed = nowMs - reveal.startMs
  const totalDuration = getRevealTotalDuration(
    reveal.geometry.stars.length,
    reveal.geometry.edges.length,
  )

  const edgeProgress = getEdgeProgress(elapsed, reveal.geometry.edges.length)
  const modifiers = getStarRevealFromEdges(
    reveal.geometry.edges,
    edgeProgress,
    reveal.geometry.stars.length,
  )
  applyStarTwinkle(twinkle, nowMs, 0, modifiers)

  drawConstellationLinesProgress(
    reveal.lines,
    reveal.geometry.stars,
    reveal.geometry.edges,
    edgeProgress,
    reveal.lineStyle,
    reveal.linesGlow,
    true,
  )

  if (elapsed >= totalDuration) {
    if (!reveal.complete) {
      reveal.complete = true
      reveal.onComplete?.()
    }
    return true
  }

  return false
}
