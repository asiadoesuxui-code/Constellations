import { BlurFilter, Container, Graphics } from 'pixi.js'
import { SeededRandom } from '../generation/seededRandom'

const NEBULA_SEED = 42

const WARM_GLOWS = [
  { color: 0x3a3020, alpha: 0.22 },
  { color: 0x2a2218, alpha: 0.18 },
  { color: 0x1a1810, alpha: 0.15 },
]

export function createNebulaLayer(parent: Container): Container {
  const layer = new Container()
  const rng = new SeededRandom(NEBULA_SEED)
  const count = 6 + rng.nextInt(0, 2)

  for (let i = 0; i < count; i++) {
    const g = new Graphics()
    const cfg = WARM_GLOWS[i % WARM_GLOWS.length]
    const rx = 140 + rng.next() * 200
    const ry = 90 + rng.next() * 150
    const x = (rng.next() - 0.5) * 4000
    const y = (rng.next() - 0.5) * 4000

    g.ellipse(0, 0, rx, ry)
    g.fill({ color: cfg.color, alpha: cfg.alpha })
    g.x = x
    g.y = y
    g.rotation = rng.next() * Math.PI

    const blur = new BlurFilter({ strength: 50 + rng.next() * 35 })
    g.filters = [blur]
    layer.addChild(g)
  }

  parent.addChildAt(layer, 1)
  return layer
}
