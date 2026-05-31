import { Assets, Container, Sprite } from 'pixi.js'

/** Figma step 1 frame size — positions are top-left of each exported frame within step 1. */
const STEP1_WIDTH = 1440
const STEP1_HEIGHT = 812

export interface LandingConstellationPlacement {
  /** Public URL under /landing/ */
  src: string
  /** Top-left X within the Figma step 1 frame */
  figmaX: number
  /** Top-left Y within the Figma step 1 frame */
  figmaY: number
  /** Native export width */
  width: number
  /** Native export height */
  height: number
}

/**
 * Exact Figma exports for step 1 child frames:
 * - constellation (node 2:99)
 * - constellation 2 (node 3:2026)
 * - constellation 3 (node 3:2040)
 * - constellation 5 (node 3:2013)
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

  await Promise.all(
    LANDING_CONSTELLATIONS.map(async (def) => {
      const texture = await Assets.load(def.src)
      const sprite = new Sprite(texture)
      sprite.anchor.set(0.5)
      const { x, y } = figmaToWorld(def.figmaX, def.figmaY, def.width, def.height)
      sprite.x = x
      sprite.y = y
      sprite.label = def.src
      layer.addChild(sprite)
    }),
  )

  parent.addChild(layer)
  return layer
}
