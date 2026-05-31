export interface CameraState {
  x: number
  y: number
  zoom: number
}

export class CameraController {
  x = 0
  y = 0
  zoom = 1
  minZoom = 0.3
  maxZoom = 3

  private tween: {
    startX: number
    startY: number
    targetX: number
    targetY: number
    startTime: number
    duration: number
    resolve: () => void
  } | null = null

  screenToWorld(screenX: number, screenY: number, screenW: number, screenH: number) {
    return {
      x: (screenX - screenW / 2) / this.zoom + this.x,
      y: (screenY - screenH / 2) / this.zoom + this.y,
    }
  }

  worldToScreen(worldX: number, worldY: number, screenW: number, screenH: number) {
    return {
      x: (worldX - this.x) * this.zoom + screenW / 2,
      y: (worldY - this.y) * this.zoom + screenH / 2,
    }
  }

  getBounds(screenW: number, screenH: number, margin = 0) {
    const halfW = screenW / 2 / this.zoom + margin
    const halfH = screenH / 2 / this.zoom + margin
    return {
      minX: this.x - halfW,
      maxX: this.x + halfW,
      minY: this.y - halfH,
      maxY: this.y + halfH,
    }
  }

  panTo(targetX: number, targetY: number, durationMs = 1200): Promise<void> {
    if (this.tween) {
      this.tween.resolve()
      this.tween = null
    }

    return new Promise((resolve) => {
      this.tween = {
        startX: this.x,
        startY: this.y,
        targetX,
        targetY,
        startTime: performance.now(),
        duration: durationMs,
        resolve,
      }
    })
  }

  update(): boolean {
    if (!this.tween) return false
    const elapsed = performance.now() - this.tween.startTime
    const t = Math.min(elapsed / this.tween.duration, 1)
    const eased = 1 - Math.pow(1 - t, 3)
    this.x = this.tween.startX + (this.tween.targetX - this.tween.startX) * eased
    this.y = this.tween.startY + (this.tween.targetY - this.tween.startY) * eased
    if (t >= 1) {
      this.tween.resolve()
      this.tween = null
    }
    return true
  }

  applyToContainer(container: { x: number; y: number; scale: { set: (v: number) => void } }, screenW: number, screenH: number) {
    container.x = screenW / 2 - this.x * this.zoom
    container.y = screenH / 2 - this.y * this.zoom
    container.scale.set(this.zoom)
  }
}
