import { Assets, Container, Sprite } from 'pixi.js'

export interface LandingConstellationPlacement {
  /** Public URL under /landing/ — Figma-exported constellation artwork */
  src: string
  /** Native export width */
  width: number
  /** Native export height */
  height: number
  /**
   * Center position as a fraction of half the viewport.
   * -1 = far left/top edge, 1 = far right/bottom edge.
   */
  anchorX: number
  anchorY: number
  scale?: number
  rotation?: number
  alpha?: number
}

/** Four Figma exports — one anchored near each viewport corner. */
export const LANDING_CONSTELLATIONS: LandingConstellationPlacement[] = [
  { src: '/landing/constellation-2.png', width: 324, height: 338, anchorX: -0.9, anchorY: -0.74 },
  { src: '/landing/constellation-3.png', width: 290, height: 279, anchorX: 0.9, anchorY: -0.7 },
  { src: '/landing/constellation.png', width: 524, height: 413, anchorX: -0.84, anchorY: 0.78 },
  { src: '/landing/constellation-5.png', width: 188, height: 188, anchorX: 0.84, anchorY: 0.74, scale: 1.15 },
]

function placeCenter(
  def: LandingConstellationPlacement,
  halfW: number,
  halfH: number,
): { x: number; y: number } {
  const scale = def.scale ?? 1
  const insetX = (def.width * scale) / 2 + 8
  const insetY = (def.height * scale) / 2 + 8
  const targetX = def.anchorX * halfW
  const targetY = def.anchorY * halfH
  return {
    x: Math.max(-halfW + insetX, Math.min(halfW - insetX, targetX)),
    y: Math.max(-halfH + insetY, Math.min(halfH - insetY, targetY)),
  }
}

export async function createLandingDecorations(
  parent: Container,
  viewportW: number,
  viewportH: number,
): Promise<Container> {
  const layer = new Container()
  layer.label = 'landing-decorations'
  const halfW = viewportW / 2
  const halfH = viewportH / 2

  const uniqueSrcs = [...new Set(LANDING_CONSTELLATIONS.map((def) => def.src))]
  await Promise.all(uniqueSrcs.map((src) => Assets.load(src)))

  for (const def of LANDING_CONSTELLATIONS) {
    const sprite = new Sprite(Assets.get(def.src))
    sprite.anchor.set(0.5)
    const { x, y } = placeCenter(def, halfW, halfH)
    sprite.x = x
    sprite.y = y
    sprite.scale.set(def.scale ?? 1)
    sprite.rotation = def.rotation ?? 0
    const baseAlpha = def.alpha ?? 1
    sprite.alpha = baseAlpha
    ;(sprite as Sprite & { landingBaseAlpha?: number }).landingBaseAlpha = baseAlpha
    sprite.label = def.src
    layer.addChild(sprite)
  }

  parent.addChild(layer)
  return layer
}

export type LandingDecorationsLayer = Container & {
  landingTime?: number
}

export function updateLandingDecorations(layer: Container, deltaMs: number): void {
  const decor = layer as LandingDecorationsLayer
  decor.landingTime = (decor.landingTime ?? 0) + deltaMs * 0.001

  for (const child of layer.children) {
    const baseAlpha =
      (child as Sprite & { landingBaseAlpha?: number }).landingBaseAlpha ?? child.alpha
    const twinkle =
      0.94 + 0.06 * Math.sin(decor.landingTime * 0.7 + child.x * 0.01 + child.y * 0.01)
    child.alpha = Math.min(1, baseAlpha * twinkle)
  }
}
