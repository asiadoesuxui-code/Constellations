import { Container, Sprite, Texture } from 'pixi.js'
import { SeededRandom } from '../generation/seededRandom'

const TILE_SIZE = 2048
const BAKE_SEED = 31415

function addFilmGrain(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 16
    data[i] = Math.max(0, Math.min(255, data[i]! + noise))
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1]! + noise))
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2]! + noise))
  }
  ctx.putImageData(imageData, 0, 0)
}

function drawFlareStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  alpha: number,
): void {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.strokeStyle = '#f5e6cc'
  ctx.lineWidth = 0.8
  const flare = size * 3.5
  ctx.beginPath()
  ctx.moveTo(x - flare, y)
  ctx.lineTo(x + flare, y)
  ctx.moveTo(x, y - flare)
  ctx.lineTo(x, y + flare)
  ctx.stroke()

  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(x, y, size, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = `rgba(245, 230, 204, ${alpha * 0.35})`
  ctx.beginPath()
  ctx.arc(x, y, size * 2.4, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function paintStarField(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const rng = new SeededRandom(BAKE_SEED)

  for (let i = 0; i < 4200; i++) {
    const x = rng.next() * width
    const y = rng.next() * height
    const roll = rng.next()

    if (roll < 0.025) {
      drawFlareStar(ctx, x, y, 1.4 + rng.next() * 1.2, 0.55 + rng.next() * 0.35)
      continue
    }

    const size = roll < 0.12 ? 1 + rng.next() * 1.2 : 0.4 + rng.next() * 0.9
    const alpha = roll < 0.12 ? 0.45 + rng.next() * 0.45 : 0.18 + rng.next() * 0.42

    ctx.fillStyle = `rgba(245, 230, 204, ${alpha})`
    ctx.beginPath()
    ctx.arc(x, y, size, 0, Math.PI * 2)
    ctx.fill()

    if (roll < 0.12) {
      ctx.fillStyle = `rgba(245, 230, 204, ${alpha * 0.25})`
      ctx.beginPath()
      ctx.arc(x, y, size * 2.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  const clusterCenters = [
    { x: width * 0.08, y: height * 0.1 },
    { x: width * 0.92, y: height * 0.12 },
    { x: width * 0.06, y: height * 0.88 },
    { x: width * 0.94, y: height * 0.9 },
  ]

  for (const center of clusterCenters) {
    const count = 280 + rng.nextInt(0, 120)
    for (let i = 0; i < count; i++) {
      const angle = rng.next() * Math.PI * 2
      const dist = rng.next() * rng.next() * 180
      const x = center.x + Math.cos(angle) * dist
      const y = center.y + Math.sin(angle) * dist
      const alpha = 0.12 + rng.next() * 0.35
      const size = 0.35 + rng.next() * 0.75

      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
      ctx.beginPath()
      ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

export function createSkyBackground(): Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = TILE_SIZE
  canvas.height = TILE_SIZE
  const ctx = canvas.getContext('2d')!

  const cx = TILE_SIZE / 2
  const cy = TILE_SIZE / 2
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, TILE_SIZE * 0.75)
  gradient.addColorStop(0, '#121212')
  gradient.addColorStop(0.45, '#0d0d0d')
  gradient.addColorStop(1, '#0a0a0a')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE)

  paintStarField(ctx, TILE_SIZE, TILE_SIZE)
  addFilmGrain(ctx, TILE_SIZE, TILE_SIZE)

  const texture = Texture.from(canvas)
  const sprite = new Sprite(texture)
  sprite.anchor.set(0.5)
  sprite.width = TILE_SIZE
  sprite.height = TILE_SIZE
  return sprite
}

export function createTiledBackground(parent: Container): Container {
  const layer = new Container()
  const tile = createSkyBackground()
  const spacing = TILE_SIZE * 0.85

  for (let row = -2; row <= 2; row++) {
    for (let col = -2; col <= 2; col++) {
      const s = new Sprite(tile.texture)
      s.anchor.set(0.5)
      s.width = TILE_SIZE
      s.height = TILE_SIZE
      s.x = col * spacing
      s.y = row * spacing
      layer.addChild(s)
    }
  }

  parent.addChild(layer)
  return layer
}
