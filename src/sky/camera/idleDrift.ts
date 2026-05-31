import type { CameraController } from './CameraController'

export class IdleDrift {
  private idleMs = 0
  private active = false
  private readonly threshold = 10000
  private phase = 0

  reset() {
    this.idleMs = 0
    this.active = false
  }

  update(deltaMs: number, camera: CameraController): void {
    if (!this.active) {
      this.idleMs += deltaMs
      if (this.idleMs >= this.threshold) {
        this.active = true
        this.phase = 0
      }
      return
    }

    this.phase += deltaMs * 0.001
    camera.x += Math.sin(this.phase * 0.3) * 0.15
    camera.y += Math.cos(this.phase * 0.25) * 0.12
  }
}
