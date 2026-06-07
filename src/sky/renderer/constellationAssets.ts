import { Sprite, Texture } from 'pixi.js'
import starDotUrl from '../../../public/landing/assets/star-dot.png?url'
import starSparkleUrl from '../../../public/landing/assets/star-sparkle.png?url'

/** Warm gold from Figma exports (line.svg fill) */
export const DESIGN_GOLD = '#D1BCA0'

/** Stroke spec derived from /landing/assets/line.svg */
export const LINE_STYLE = {
  color: DESIGN_GOLD,
  width: 1,
  opacity: 1,
  cap: 'round' as CanvasLineCap,
}

/** Native export dimensions from Figma */
export const STAR_DOT_SIZE = 33
export const STAR_SPARKLE_SIZE = 93
export const STAR_HALO_PAD = Math.ceil(STAR_SPARKLE_SIZE / 2)

/** World-space display size */
export const DOT_WORLD_SIZE = 2.2 * 2 * 4
export const SPARKLE_WORLD_SIZE = 28 * 2

let dotImage: HTMLImageElement | null = null
let sparkleImage: HTMLImageElement | null = null
let dotTexture: Texture | null = null
let sparkleTexture: Texture | null = null
let glowTexture: Texture | null = null
let loadPromise: Promise<void> | null = null

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load constellation asset: ${url}`))
    img.src = url
  })
}

export function preloadConstellationAssets(): Promise<void> {
  if (dotImage && sparkleImage && dotTexture && sparkleTexture && glowTexture) {
    return Promise.resolve()
  }
  if (loadPromise) return loadPromise
  loadPromise = Promise.all([loadImage(starDotUrl), loadImage(starSparkleUrl)]).then(
    ([dot, sparkle]) => {
      dotImage = dot
      sparkleImage = sparkle
      dotTexture = Texture.from(dot)
      sparkleTexture = Texture.from(sparkle)
      glowTexture = createSoftGlowTexture()
    },
  )
  return loadPromise
}

export function constellationAssetsReady(): boolean {
  return dotTexture !== null && sparkleTexture !== null && glowTexture !== null
}

function createSoftGlowTexture(): Texture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const cx = size / 2
  const grad = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx)
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)')
  grad.addColorStop(0.08, 'rgba(255, 255, 255, 0.65)')
  grad.addColorStop(0.22, 'rgba(255, 255, 255, 0.24)')
  grad.addColorStop(0.42, 'rgba(255, 255, 255, 0.08)')
  grad.addColorStop(0.68, 'rgba(255, 255, 255, 0.02)')
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  return Texture.from(canvas)
}

/** Warm gold glow matching constellation palette */
const STAR_GLOW_RGB = { r: 209, g: 188, b: 160 }
const STAR_GLOW_TINT = 0xf5e6cc

function starGlowAlpha(bright: boolean, glow: number): number {
  return glow * (bright ? 0.48 : 0.3)
}

function starGlowDiameter(bright: boolean, scale: number): number {
  return (bright ? 76 : 50) * scale
}

export function createStarGlowSprite(
  x: number,
  y: number,
  bright: boolean,
  glow: number,
  scale: number,
): Sprite {
  const sprite = new Sprite(glowTexture!)
  sprite.anchor.set(0.5)
  sprite.x = x
  sprite.y = y
  const diameter = starGlowDiameter(bright, scale)
  sprite.width = diameter
  sprite.height = diameter
  sprite.tint = STAR_GLOW_TINT
  sprite.alpha = starGlowAlpha(bright, glow)
  return sprite
}

export function drawStarGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  bright: boolean,
  glow: number,
  scale: number,
): void {
  const radius = starGlowDiameter(bright, scale) / 2
  const peak = starGlowAlpha(bright, glow)
  const { r, g, b } = STAR_GLOW_RGB

  ctx.save()

  const grad = ctx.createRadialGradient(x, y, 0, x, y, radius)
  grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${peak})`)
  grad.addColorStop(0.08, `rgba(${r}, ${g}, ${b}, ${peak * 0.65})`)
  grad.addColorStop(0.22, `rgba(${r}, ${g}, ${b}, ${peak * 0.24})`)
  grad.addColorStop(0.42, `rgba(${r}, ${g}, ${b}, ${peak * 0.08})`)
  grad.addColorStop(0.68, `rgba(${r}, ${g}, ${b}, ${peak * 0.02})`)
  grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

export function createStarSprite(
  x: number,
  y: number,
  bright: boolean,
  opacity = 1,
  scale = 1,
): Sprite {
  const texture = bright ? sparkleTexture! : dotTexture!
  const sprite = new Sprite(texture)
  sprite.anchor.set(0.5)
  sprite.x = x
  sprite.y = y
  const baseSize = bright ? SPARKLE_WORLD_SIZE : DOT_WORLD_SIZE
  const size = baseSize * scale
  sprite.width = size
  sprite.height = size
  sprite.alpha = opacity
  return sprite
}

export function drawStarAsset(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  bright: boolean,
  opacity = 1,
  scale = 1,
  glow = 1,
): void {
  drawStarGlow(ctx, x, y, bright, glow, scale)

  const img = bright ? sparkleImage : dotImage
  if (!img) return
  const baseSize = bright ? SPARKLE_WORLD_SIZE : DOT_WORLD_SIZE
  const size = baseSize * scale
  ctx.save()
  ctx.globalAlpha = opacity
  ctx.drawImage(img, x - size / 2, y - size / 2, size, size)
  ctx.restore()
}

export function applyLineStyle(ctx: CanvasRenderingContext2D): void {
  const { color, width, opacity, cap } = LINE_STYLE
  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)
  ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`
  ctx.lineWidth = width
  ctx.lineCap = cap
}

void preloadConstellationAssets()
