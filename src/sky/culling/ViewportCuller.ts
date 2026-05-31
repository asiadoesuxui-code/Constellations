import type { ConstellationVisual } from '../renderer/ConstellationSprite'
import {
  setConstellationRenderable,
  updateConstellationAlpha,
} from '../renderer/ConstellationSprite'

interface FadeState {
  target: number
  current: number
  speed: number
}

export class ViewportCuller {
  private fadeStates = new Map<string, FadeState>()
  private margin = 200
  private outerMargin = 400

  update(
    visuals: Map<string, ConstellationVisual>,
    bounds: { minX: number; maxX: number; minY: number; maxY: number },
    deltaMs: number,
  ): void {
    const innerMinX = bounds.minX - this.margin
    const innerMaxX = bounds.maxX + this.margin
    const innerMinY = bounds.minY - this.margin
    const innerMaxY = bounds.maxY + this.margin

    const outerMinX = bounds.minX - this.outerMargin
    const outerMaxX = bounds.maxX + this.outerMargin
    const outerMinY = bounds.minY - this.outerMargin
    const outerMaxY = bounds.maxY + this.outerMargin

    for (const [id, visual] of visuals) {
      const { x, y } = visual.record
      let fade = this.fadeStates.get(id)
      if (!fade) {
        const inView =
          x >= innerMinX && x <= innerMaxX && y >= innerMinY && y <= innerMaxY
        fade = { target: inView ? 1 : 0, current: inView ? 1 : 0, speed: 0.003 }
        this.fadeStates.set(id, fade)
      }

      const inInner =
        x >= innerMinX && x <= innerMaxX && y >= innerMinY && y <= innerMaxY
      const inOuter =
        x >= outerMinX && x <= outerMaxX && y >= outerMinY && y <= outerMaxY

      if (inInner) {
        fade.target = 1
        setConstellationRenderable(visual, true)
      } else if (inOuter) {
        fade.target = 0
        setConstellationRenderable(visual, true)
      } else {
        fade.target = 0
        if (fade.current <= 0.01) {
          setConstellationRenderable(visual, false)
        }
      }

      const fadeSpeed = fade.target > fade.current ? 0.0025 : 0.0033
      fade.speed = fadeSpeed
      if (fade.current < fade.target) {
        fade.current = Math.min(fade.target, fade.current + fadeSpeed * deltaMs)
      } else if (fade.current > fade.target) {
        fade.current = Math.max(fade.target, fade.current - fadeSpeed * deltaMs)
      }

      updateConstellationAlpha(visual, fade.current)
    }
  }
}
