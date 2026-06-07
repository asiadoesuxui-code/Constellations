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
  if (dotImage && sparkleImage && dotTexture && sparkleTexture) return Promise.resolve()
  if (loadPromise) return loadPromise
  loadPromise = Promise.all([loadImage(starDotUrl), loadImage(starSparkleUrl)]).then(
    ([dot, sparkle]) => {
      dotImage = dot
      sparkleImage = sparkle
      dotTexture = Texture.from(dot)
      sparkleTexture = Texture.from(sparkle)
    },
  )
  return loadPromise
}

export function constellationAssetsReady(): boolean {
  return dotTexture !== null && sparkleTexture !== null
}

export function createStarSprite(x: number, y: number, bright: boolean): Sprite {
  const texture = bright ? sparkleTexture! : dotTexture!
  const sprite = new Sprite(texture)
  sprite.anchor.set(0.5)
  sprite.x = x
  sprite.y = y
  const size = bright ? SPARKLE_WORLD_SIZE : DOT_WORLD_SIZE
  sprite.width = size
  sprite.height = size
  return sprite
}

export function drawStarAsset(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  bright: boolean,
  alpha = 1,
): void {
  const img = bright ? sparkleImage : dotImage
  if (!img) return
  const size = bright ? SPARKLE_WORLD_SIZE : DOT_WORLD_SIZE
  ctx.save()
  ctx.globalAlpha = alpha
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
