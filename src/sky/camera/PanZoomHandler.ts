import type { CameraController } from './CameraController'

export class PanZoomHandler {
  private dragging = false
  private lastX = 0
  private lastY = 0
  private pointers = new Map<number, { x: number; y: number }>()
  private lastPinchDist = 0
  private canvas: HTMLCanvasElement
  private camera: CameraController
  private onInteraction: () => void

  constructor(
    canvas: HTMLCanvasElement,
    camera: CameraController,
    onInteraction: () => void,
  ) {
    this.canvas = canvas
    this.camera = camera
    this.onInteraction = onInteraction
    canvas.style.touchAction = 'none'
    canvas.addEventListener('pointerdown', this.onPointerDown)
    canvas.addEventListener('pointermove', this.onPointerMove)
    canvas.addEventListener('pointerup', this.onPointerUp)
    canvas.addEventListener('pointercancel', this.onPointerUp)
    canvas.addEventListener('wheel', this.onWheel, { passive: false })
  }

  destroy() {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown)
    this.canvas.removeEventListener('pointermove', this.onPointerMove)
    this.canvas.removeEventListener('pointerup', this.onPointerUp)
    this.canvas.removeEventListener('pointercancel', this.onPointerUp)
    this.canvas.removeEventListener('wheel', this.onWheel)
  }

  private onPointerDown = (e: PointerEvent) => {
    this.onInteraction()
    this.canvas.setPointerCapture(e.pointerId)
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (this.pointers.size === 1) {
      this.dragging = true
      this.lastX = e.clientX
      this.lastY = e.clientY
    } else if (this.pointers.size === 2) {
      this.dragging = false
      this.lastPinchDist = this.getPinchDistance()
    }
  }

  private onPointerMove = (e: PointerEvent) => {
    if (!this.pointers.has(e.pointerId)) return
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (this.pointers.size === 2) {
      const dist = this.getPinchDistance()
      if (this.lastPinchDist > 0) {
        const scale = dist / this.lastPinchDist
        this.camera.zoom = Math.max(
          this.camera.minZoom,
          Math.min(this.camera.maxZoom, this.camera.zoom * scale),
        )
      }
      this.lastPinchDist = dist
      return
    }

    if (this.dragging) {
      const dx = e.clientX - this.lastX
      const dy = e.clientY - this.lastY
      this.camera.x -= dx / this.camera.zoom
      this.camera.y -= dy / this.camera.zoom
      this.lastX = e.clientX
      this.lastY = e.clientY
    }
  }

  private onPointerUp = (e: PointerEvent) => {
    this.pointers.delete(e.pointerId)
    if (this.pointers.size === 0) {
      this.dragging = false
      this.lastPinchDist = 0
    } else if (this.pointers.size === 1) {
      const remaining = [...this.pointers.values()][0]
      this.dragging = true
      this.lastX = remaining.x
      this.lastY = remaining.y
    }
  }

  private onWheel = (e: WheelEvent) => {
    e.preventDefault()
    this.onInteraction()
    const factor = e.deltaY > 0 ? 0.92 : 1.08
    this.camera.zoom = Math.max(
      this.camera.minZoom,
      Math.min(this.camera.maxZoom, this.camera.zoom * factor),
    )
  }

  private getPinchDistance(): number {
    const pts = [...this.pointers.values()]
    if (pts.length < 2) return 0
    const dx = pts[0].x - pts[1].x
    const dy = pts[0].y - pts[1].y
    return Math.sqrt(dx * dx + dy * dy)
  }
}
