import { Texture } from 'pixi.js'
import type { ConstellationGeometry } from '../../types/contracts'
import {
  applyLineStyle,
  constellationAssetsReady,
  drawStarAsset,
  STAR_HALO_PAD,
} from './constellationAssets'

export { DESIGN_GOLD, preloadConstellationAssets } from './constellationAssets'

/** Compact bounding box matching landing constellation PNG exports */
const TARGET_MAX = 280

export interface ConstellationRenderProgress {
  starsRevealed: number
  edgeProgress: number[]
}

export interface ConstellationCanvasResult {
  canvas: HTMLCanvasElement
  width: number
  height: number
  offsetX: number
  offsetY: number
}

function contentBounds(geometry: ConstellationGeometry) {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const star of geometry.stars) {
    minX = Math.min(minX, star.x)
    maxX = Math.max(maxX, star.x)
    minY = Math.min(minY, star.y)
    maxY = Math.max(maxY, star.y)
  }
  return { minX, maxX, minY, maxY }
}

function fitScale(geometry: ConstellationGeometry): number {
  const { minX, maxX, minY, maxY } = contentBounds(geometry)
  const span = Math.max(maxX - minX, maxY - minY, 1)
  return TARGET_MAX / span
}

export function renderConstellationToCanvas(
  geometry: ConstellationGeometry,
  targetCanvas: HTMLCanvasElement,
  progress: ConstellationRenderProgress = {
    starsRevealed: geometry.stars.length,
    edgeProgress: geometry.edges.map(() => 1),
  },
): ConstellationCanvasResult {
  const { minX, maxX, minY, maxY } = contentBounds(geometry)
  const scale = fitScale(geometry)
  const contentW = (maxX - minX) * scale
  const contentH = (maxY - minY) * scale
  const width = Math.ceil(contentW + STAR_HALO_PAD * 2)
  const height = Math.ceil(contentH + STAR_HALO_PAD * 2)
  const offsetX = STAR_HALO_PAD - minX * scale
  const offsetY = STAR_HALO_PAD - minY * scale

  targetCanvas.width = width
  targetCanvas.height = height
  targetCanvas.style.width = `${width}px`
  targetCanvas.style.height = `${height}px`

  const ctx = targetCanvas.getContext('2d')!
  ctx.clearRect(0, 0, width, height)

  if (!constellationAssetsReady()) return { canvas: targetCanvas, width, height, offsetX, offsetY }

  applyLineStyle(ctx)
  ctx.beginPath()
  geometry.edges.forEach(([a, b], i) => {
    const t = progress.edgeProgress[i] ?? 0
    if (t <= 0) return
    const sa = geometry.stars[a]
    const sb = geometry.stars[b]
    const x1 = sa.x * scale + offsetX
    const y1 = sa.y * scale + offsetY
    const x2 = (sa.x + (sb.x - sa.x) * t) * scale + offsetX
    const y2 = (sa.y + (sb.y - sa.y) * t) * scale + offsetY
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
  })
  ctx.stroke()

  geometry.stars.forEach((star, i) => {
    if (i >= progress.starsRevealed) return
    drawStarAsset(ctx, star.x * scale + offsetX, star.y * scale + offsetY, star.bright)
  })

  return { canvas: targetCanvas, width, height, offsetX, offsetY }
}

export function createConstellationCanvas(
  geometry: ConstellationGeometry,
  progress?: ConstellationRenderProgress,
): ConstellationCanvasResult {
  const canvas = document.createElement('canvas')
  return renderConstellationToCanvas(geometry, canvas, progress)
}

export function createConstellationTexture(
  geometry: ConstellationGeometry,
  progress?: ConstellationRenderProgress,
): { texture: Texture; width: number; height: number } {
  const { canvas, width, height } = createConstellationCanvas(geometry, progress)
  const texture = Texture.from(canvas)
  return { texture, width, height }
}

export function updateConstellationTexture(
  texture: Texture,
  geometry: ConstellationGeometry,
  progress?: ConstellationRenderProgress,
): { width: number; height: number } {
  const source = texture.source
  const resource = source.resource
  if (!(resource instanceof HTMLCanvasElement)) {
    throw new Error('Constellation texture must be canvas-backed')
  }
  const result = renderConstellationToCanvas(geometry, resource, progress)
  source.update()
  return { width: result.width, height: result.height }
}

export function drawConstellationOnCanvas(
  ctx: CanvasRenderingContext2D,
  geometry: ConstellationGeometry,
  scale = 1.8,
): void {
  const full = createConstellationCanvas(geometry)
  const drawW = full.width * scale
  const drawH = full.height * scale
  ctx.drawImage(full.canvas, -drawW / 2, -drawH / 2, drawW, drawH)
}
