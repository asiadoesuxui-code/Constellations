import { Container, Graphics } from 'pixi.js'
import { SeededRandom } from '../generation/seededRandom'

const AMBIENT_SEED = 7777

type StarKind = 'pinpoint' | 'soft' | 'flare'

interface AmbientStar {
  baseAlpha: number
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

function pickKind(rng: SeededRandom): StarKind {
  const roll = rng.next()
  if (roll < 0.05) return 'flare'
  if (roll < 0.2) return 'soft'
  return 'pinpoint'
}

export class AmbientStarsLayer {
  readonly container = new Container()
  private stars: AmbientStar[] = []
  private time = 0

  constructor(count: number, viewportW: number, viewportH: number) {
    const rng = new SeededRandom(AMBIENT_SEED)
    const spreadW = Math.max(viewportW * 1.6, 1400)
    const spreadH = Math.max(viewportH * 1.6, 900)

    for (let i = 0; i < count; i++) {
      const kind = pickKind(rng)
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
        phase: rng.next() * Math.PI * 2,
        speed: 0.4 + rng.next() * 1.8,
        graphics: g,
      })
      this.container.addChild(g)
    }

    this.addViewportClusters(rng, viewportW, viewportH)
  }

  private addViewportClusters(
    rng: SeededRandom,
    viewportW: number,
    viewportH: number,
  ): void {
    const halfW = viewportW * 0.48
    const halfH = viewportH * 0.46
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
          phase: rng.next() * Math.PI * 2,
          speed: 0.3 + rng.next() * 1.2,
          graphics: g,
        })
        this.container.addChild(g)
      }
    }
  }

  update(deltaMs: number): void {
    this.time += deltaMs * 0.001
    for (const star of this.stars) {
      const twinkle =
        star.baseAlpha * (0.7 + 0.3 * Math.sin(this.time * star.speed + star.phase))
      star.graphics.alpha = twinkle
    }
  }
}

export function createAmbientStarsLayer(
  parent: Container,
  viewportW: number,
  viewportH: number,
  mobile = false,
): AmbientStarsLayer {
  const count = mobile ? 350 : 550
  const layer = new AmbientStarsLayer(count, viewportW, viewportH)
  parent.addChild(layer.container)
  return layer
}
