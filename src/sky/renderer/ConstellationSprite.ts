import { Container, Graphics } from 'pixi.js'
import type { ConstellationGeometry, ConstellationRecord } from '../../types/contracts'
import { generateConstellation } from '../generation/generateConstellation'
import { addStarGraphics, drawConstellationLines } from './drawStars'

function envelopeRadius(stars: ConstellationGeometry['stars']): number {
  let max = 30
  for (const star of stars) {
    const r = Math.hypot(star.x, star.y)
    if (r > max) max = r
  }
  return max + 25
}

export interface ConstellationVisual {
  container: Container
  record: ConstellationRecord
  hitRadius: number
  alpha: number
  renderable: boolean
}

export function createConstellationSprite(record: ConstellationRecord): ConstellationVisual {
  const geometry = generateConstellation(record.seed, record.colour_palette)
  const container = new Container()
  container.x = record.x
  container.y = record.y
  container.label = record.id

  const lines = new Graphics()
  drawConstellationLines(lines, geometry.stars, geometry.edges, geometry.colour)
  container.addChild(lines)

  for (const star of geometry.stars) {
    addStarGraphics(container, star.x, star.y, star.bright, geometry.colour, geometry.glowColour)
  }

  return {
    container,
    record,
    hitRadius: envelopeRadius(geometry.stars),
    alpha: 1,
    renderable: true,
  }
}

export function updateConstellationAlpha(visual: ConstellationVisual, alpha: number): void {
  visual.alpha = alpha
  visual.container.alpha = alpha
}

export function setConstellationRenderable(visual: ConstellationVisual, renderable: boolean): void {
  visual.renderable = renderable
  visual.container.renderable = renderable
  visual.container.visible = renderable
}
