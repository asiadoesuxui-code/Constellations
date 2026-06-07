import { Assets, Container, Sprite } from 'pixi.js'

/** Figma step 1 frame — world origin is the frame center. */
const STEP1_WIDTH = 1440
const STEP1_HEIGHT = 812

export interface LandingConstellationPlacement {
  /** Public URL under /landing/ — Figma-exported constellation artwork */
  src: string
  /** Top-left X within the Figma step 1 frame */
  figmaX: number
  /** Top-left Y within the Figma step 1 frame */
  figmaY: number
  /** Native export width */
  width: number
  /** Native export height */
  height: number
  scale?: number
  rotation?: number
  alpha?: number
}

/**
 * Exact Figma step-1 child frames — only these four, at their Figma positions:
 * constellation (2:99), constellation 2 (3:2026), constellation 3 (3:2040), constellation 5 (3:2013)
 */
export const LANDING_CONSTELLATIONS: LandingConstellationPlacement[] = [
  { src: '/landing/constellation.png', figmaX: 40, figmaY: 260, width: 524, height: 413 },
  { src: '/landing/constellation-2.png', figmaX: 140, figmaY: 40, width: 324, height: 338 },
  { src: '/landing/constellation-3.png', figmaX: 960, figmaY: 60, width: 290, height: 279 },
  { src: '/landing/constellation-5.png', figmaX: 1130, figmaY: 560, width: 188, height: 188 },
]

function figmaToWorld(figmaX: number, figmaY: number, width: number, height: number) {
  return {
    x: figmaX + width / 2 - STEP1_WIDTH / 2,
    y: figmaY + height / 2 - STEP1_HEIGHT / 2,
  }
}

export async function createLandingDecorations(parent: Container): Promise<Container> {
  const layer = new Container()
  layer.label = 'landing-decorations'

  const uniqueSrcs = [...new Set(LANDING_CONSTELLATIONS.map((def) => def.src))]
  await Promise.all(uniqueSrcs.map((src) => Assets.load(src)))

  for (const def of LANDING_CONSTELLATIONS) {
    const sprite = new Sprite(Assets.get(def.src))
    sprite.anchor.set(0.5)
    const { x, y } = figmaToWorld(def.figmaX, def.figmaY, def.width, def.height)
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
