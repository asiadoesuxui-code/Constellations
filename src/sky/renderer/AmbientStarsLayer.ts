import { Container, Graphics } from 'pixi.js'
import { SeededRandom } from '../generation/seededRandom'
import { SKY_TILE_SPACING } from './SkyBackground'

export type SkyViewMode = 'landing' | 'exploring'

type StarKind = 'pinpoint' | 'soft' | 'flare'

interface AmbientStar {
  baseAlpha: number
  baseSize: number
  kind: StarKind
  phase: number
  speed: number
  graphics: Graphics
}

function createStarGraphic(kind: StarKind, size: number, alpha: number): Graphics {
  const g = new Graphics()

  if (kind === 'flare') {
    const flareLen = size * 3.2
    g.moveTo(-flareLen, 0)
    g.lineTo(flareLen, 0)
    g.moveTo(0, -flareLen)
    g.lineTo(0, flareLen)
    g.stroke({ color: 0xf5e6cc, width: 0.7, alpha: alpha * 0.65 })

    g.circle(0, 0, size * 2.2)
    g.fill({ color: 0xf5e6cc, alpha: alpha * 0.22 })

    g.circle(0, 0, size)
    g.fill({ color: 0xffffff, alpha })
    return g
  }

  if (kind === 'soft') {
    g.circle(0, 0, size * 2.8)
    g.fill({ color: 0xf5e6cc, alpha: alpha * 0.2 })
  }

  g.circle(0, 0, size)
  g.fill({ color: 0xffffff, alpha })
  return g
}

function pickKind(rng: SeededRandom, allowFlares: boolean): StarKind {
  const roll = rng.next()
  if (allowFlares && roll < 0.05) return 'flare'
  if (roll < 0.2) return 'soft'
  return 'pinpoint'
}

export class AmbientStarsLayer {
  readonly container = new Container()
  private stars: AmbientStar[] = []
  private time = 0
  private mode: SkyViewMode = 'landing'
  private alphaMultiplier = 1
  private sizeMultiplier = 1
  private revealDim = 1

  constructor(
    count: number,
    spreadW: number,
    spreadH: number,
    seed = 7777,
    options: { includeClusters?: boolean; allowFlares?: boolean } = {},
  ) {
    const { includeClusters = false, allowFlares = true } = options
    const rng = new SeededRandom(seed)

    for (let i = 0; i < count; i++) {
      const kind = pickKind(rng, allowFlares)
      const size =
        kind === 'flare'
          ? 2.2 + rng.next() * 1.4
          : kind === 'soft'
            ? 1.4 + rng.next() * 1.2
            : 0.8 + rng.next() * 1.1
      const baseAlpha =
        kind === 'flare' ? 0.65 + rng.next() * 0.3 : 0.35 + rng.next() * 0.45
      const g = createStarGraphic(kind, size, baseAlpha)

      g.x = (rng.next() - 0.5) * spreadW
      g.y = (rng.next() - 0.5) * spreadH

      this.stars.push({
        baseAlpha,
        baseSize: size,
        kind,
        phase: rng.next() * Math.PI * 2,
        speed: 0.4 + rng.next() * 1.8,
        graphics: g,
      })
      this.container.addChild(g)
    }

    if (includeClusters) {
      this.addViewportClusters(rng, spreadW, spreadH)
    }
  }

  private addViewportClusters(
    rng: SeededRandom,
    spreadW: number,
    spreadH: number,
  ): void {
    const halfW = spreadW * 0.48
    const halfH = spreadH * 0.46
    const clusterCenters = [
      { x: -halfW, y: -halfH },
      { x: halfW, y: -halfH },
      { x: -halfW, y: halfH },
      { x: halfW, y: halfH },
    ]

    for (const center of clusterCenters) {
      const count = 140 + rng.nextInt(0, 80)
      for (let i = 0; i < count; i++) {
        const angle = rng.next() * Math.PI * 2
        const dist = rng.next() * rng.next() * 220
        const size = 0.6 + rng.next() * 1.1
        const baseAlpha = 0.25 + rng.next() * 0.45
        const g = new Graphics()
        g.circle(0, 0, size)
        g.fill({ color: 0xffffff, alpha: baseAlpha })
        g.x = center.x + Math.cos(angle) * dist
        g.y = center.y + Math.sin(angle) * dist

        this.stars.push({
          baseAlpha,
          baseSize: size,
          kind: 'pinpoint',
          phase: rng.next() * Math.PI * 2,
          speed: 0.3 + rng.next() * 1.2,
          graphics: g,
        })
        this.container.addChild(g)
      }
    }
  }

  setViewMode(mode: SkyViewMode): void {
    this.mode = mode
    if (mode === 'landing') {
      this.alphaMultiplier = 1
      this.sizeMultiplier = 1
      return
    }

    this.alphaMultiplier = 0.1
    this.sizeMultiplier = 0.34
  }

  setRevealDim(factor: number): void {
    this.revealDim = factor
  }

  update(deltaMs: number): void {
    this.time += deltaMs * 0.001
    for (const star of this.stars) {
      const twinkle =
        star.baseAlpha * (0.7 + 0.3 * Math.sin(this.time * star.speed + star.phase))
      const flarePenalty = this.mode === 'exploring' && star.kind === 'flare' ? 0.15 : 1
      const softPenalty = this.mode === 'exploring' && star.kind === 'soft' ? 0.55 : 1
      star.graphics.alpha =
        twinkle * this.alphaMultiplier * flarePenalty * softPenalty * this.revealDim
      star.graphics.scale.set(this.sizeMultiplier)
    }
  }
}

class TiledAmbientStarsLayer {
  readonly container = new Container()
  private cells: AmbientStarsLayer[] = []

  constructor(_viewportW: number, _viewportH: number, mobile = false) {
    const spread = SKY_TILE_SPACING
    const centerCount = mobile ? 130 : 190
    const tileCount = mobile ? 38 : 55
    const gridRadius = 3

    for (let row = -gridRadius; row <= gridRadius; row++) {
      for (let col = -gridRadius; col <= gridRadius; col++) {
        const isCenter = row === 0 && col === 0
        const seed = 7777 + row * 131 + col * 919
        const cell = new AmbientStarsLayer(
          isCenter ? centerCount : tileCount,
          spread,
          spread,
          seed,
          {
            allowFlares: isCenter,
          },
        )
        cell.container.x = col * SKY_TILE_SPACING
        cell.container.y = row * SKY_TILE_SPACING
        this.cells.push(cell)
        this.container.addChild(cell.container)
      }
    }
  }

  setViewMode(mode: SkyViewMode): void {
    for (const cell of this.cells) {
      cell.setViewMode(mode)
    }
  }

  setRevealDim(factor: number): void {
    for (const cell of this.cells) {
      cell.setRevealDim(factor)
    }
  }

  update(deltaMs: number): void {
    for (const cell of this.cells) {
      cell.update(deltaMs)
    }
  }
}

export function createAmbientStarsLayer(
  parent: Container,
  viewportW: number,
  viewportH: number,
  mobile = false,
): TiledAmbientStarsLayer {
  const layer = new TiledAmbientStarsLayer(viewportW, viewportH, mobile)
  parent.addChild(layer.container)
  return layer
}

export type AmbientStarsLayerHandle = TiledAmbientStarsLayer
