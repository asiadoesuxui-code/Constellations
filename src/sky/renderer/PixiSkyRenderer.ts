import { Application, Container } from 'pixi.js'
import type { BoundingBox, ConstellationRecord } from '../../types/contracts'
import { runPlacementAnimation } from '../animations/placementAnimation'
import { recordFromWish } from '../skyApi'
import { CameraController } from '../camera/CameraController'
import { IdleDrift } from '../camera/idleDrift'
import { PanZoomHandler } from '../camera/PanZoomHandler'
import { SpatialGrid } from '../culling/spatialGrid'
import { ViewportCuller } from '../culling/ViewportCuller'
import {
  createConstellationSprite,
  type ConstellationVisual,
} from '../renderer/ConstellationSprite'
import {
  createAmbientStarsLayer,
  type AmbientStarsLayerHandle,
  type SkyViewMode,
} from '../renderer/AmbientStarsLayer'
import {
  createLandingDecorations,
  updateLandingDecorations,
} from '../renderer/landingDecorations'
import { createNebulaLayer } from '../renderer/NebulaLayer'
import { createTiledBackground } from '../renderer/SkyBackground'

export interface SkyRendererOptions {
  onBoundsChange?: (bounds: BoundingBox) => void
  onHover?: (record: ConstellationRecord | null, screenX: number, screenY: number) => void
  fetchConstellations?: (bounds: BoundingBox) => Promise<ConstellationRecord[]>
}

export class PixiSkyRenderer {
  app!: Application
  worldLayer = new Container()
  constellationLayer = new Container()
  camera = new CameraController()
  spatialGrid = new SpatialGrid()
  culler = new ViewportCuller()

  private visuals = new Map<string, ConstellationVisual>()
  private panZoom?: PanZoomHandler
  private idleDrift = new IdleDrift()
  private ambientLayer?: AmbientStarsLayerHandle
  private backgroundLayer?: Container
  private landingLayer?: Container
  private viewMode: SkyViewMode = 'landing'
  private options: SkyRendererOptions
  private lastFetchBounds: string | null = null
  private fetchDebounce: ReturnType<typeof setTimeout> | null = null
  private hoveredId: string | null = null
  private destroyed = false
  private initGeneration = 0
  private canvasElement: HTMLCanvasElement | null = null
  private appInitialized = false

  constructor(options: SkyRendererOptions = {}) {
    this.options = options
  }

  async init(canvas: HTMLCanvasElement): Promise<void> {
    const generation = ++this.initGeneration
    this.canvasElement = canvas
    const mobile = window.matchMedia('(max-width: 768px)').matches
    this.app = new Application()
    await this.app.init({
      canvas,
      resizeTo: window,
      background: '#0a0a0a',
      backgroundAlpha: 1,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio, 2),
      autoDensity: true,
    })

    if (this.destroyed || generation !== this.initGeneration) {
      this.safeDestroyApp()
      return
    }

    this.appInitialized = true
    this.app.stage.addChild(this.worldLayer)
    this.backgroundLayer = createTiledBackground(this.worldLayer)
    createNebulaLayer(this.worldLayer)
    this.ambientLayer = createAmbientStarsLayer(
      this.worldLayer,
      this.app.screen.width,
      this.app.screen.height,
      mobile,
    )
    this.landingLayer = await createLandingDecorations(this.worldLayer)
    this.worldLayer.addChild(this.constellationLayer)

    this.panZoom = new PanZoomHandler(canvas, this.camera, () => this.onUserInteraction())

    canvas.addEventListener('pointermove', this.handleHover)
    canvas.addEventListener('pointerleave', this.handlePointerLeave)
    canvas.addEventListener('wheel', this.onUserInteraction, { passive: true })

    this.app.ticker.add((ticker) => {
      const deltaMs = ticker.deltaMS
      this.camera.update()
      this.idleDrift.update(deltaMs, this.camera)
      this.camera.applyToContainer(
        this.worldLayer,
        this.app.screen.width,
        this.app.screen.height,
      )
      this.ambientLayer?.update(deltaMs)
      if (this.viewMode === 'landing' && this.landingLayer) {
        updateLandingDecorations(this.landingLayer, deltaMs)
      }
      const bounds = this.camera.getBounds(this.app.screen.width, this.app.screen.height)
      this.culler.update(this.visuals, bounds, deltaMs)
      this.scheduleFetch(bounds)
    })

    const initialBounds = this.camera.getBounds(
      this.app.screen.width,
      this.app.screen.height,
      1000,
    )
    await this.loadBounds(initialBounds)
  }

  destroy(): void {
    this.destroyed = true
    this.panZoom?.destroy()
    this.panZoom = undefined
    if (this.fetchDebounce) clearTimeout(this.fetchDebounce)

    const canvas = this.canvasElement
    if (canvas) {
      canvas.removeEventListener('pointermove', this.handleHover)
      canvas.removeEventListener('pointerleave', this.handlePointerLeave)
      canvas.removeEventListener('wheel', this.onUserInteraction)
    }
    this.canvasElement = null
    this.safeDestroyApp()
  }

  private safeDestroyApp(): void {
    if (!this.appInitialized || !this.app) return
    try {
      this.app.destroy(true)
    } catch {
      // App may be partially initialized during StrictMode remount.
    }
    this.appInitialized = false
  }

  async placeNewConstellation(wish: string, x: number, y: number): Promise<void> {
    await this.revealConstellation(recordFromWish(wish, x, y))
  }

  loadConstellationsFromData(constellations: ConstellationRecord[]): void {
    for (const record of constellations) {
      this.addConstellation(record)
    }
  }

  setOnHover(
    handler: (record: ConstellationRecord | null, screenX: number, screenY: number) => void,
  ): void {
    this.options.onHover = handler
  }

  setViewMode(mode: SkyViewMode): void {
    if (this.viewMode === mode) return
    this.viewMode = mode

    if (this.landingLayer) {
      this.landingLayer.visible = mode === 'landing'
    }

    if (this.backgroundLayer) {
      this.backgroundLayer.alpha = mode === 'landing' ? 1 : 0.62
    }

    this.ambientLayer?.setViewMode(mode)
  }

  private onUserInteraction = (): void => {
    this.idleDrift.reset()
  }

  addConstellation(record: ConstellationRecord): void {
    if (this.spatialGrid.has(record.id)) return
    this.spatialGrid.add(record)
    const visual = createConstellationSprite(record)
    this.visuals.set(record.id, visual)
    this.constellationLayer.addChild(visual.container)
  }

  async revealConstellation(record: ConstellationRecord): Promise<void> {
    this.onUserInteraction()
    await this.camera.panTo(record.x, record.y, 1400)
    await runPlacementAnimation(this.constellationLayer, record)
    this.addConstellation(record)
  }

  revealFromWish(wish: string, x: number, y: number): Promise<void> {
    return this.revealConstellation(recordFromWish(wish, x, y))
  }

  setHighlightedId(id: string | null): void {
    for (const [vid, visual] of this.visuals) {
      visual.container.scale.set(vid === id ? 1.15 : 1)
    }
  }

  getCameraPosition() {
    return { x: this.camera.x, y: this.camera.y, zoom: this.camera.zoom }
  }

  worldToScreen(x: number, y: number) {
    return this.camera.worldToScreen(x, y, this.app.screen.width, this.app.screen.height)
  }

  private handlePointerLeave = (): void => {
    if (this.hoveredId === null) return
    this.hoveredId = null
    this.options.onHover?.(null, 0, 0)
  }

  private handleHover = (e: PointerEvent) => {
    if (!this.appInitialized) return
    this.onUserInteraction()
    const canvas = this.canvasElement
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const world = this.camera.screenToWorld(
      sx,
      sy,
      this.app.screen.width,
      this.app.screen.height,
    )

    let found: ConstellationRecord | null = null
    for (const visual of this.visuals.values()) {
      if (!visual.renderable || visual.alpha < 0.1) continue
      const dx = world.x - visual.record.x
      const dy = world.y - visual.record.y
      if (dx * dx + dy * dy <= visual.hitRadius * visual.hitRadius) {
        found = visual.record
        break
      }
    }

    if (found?.id !== this.hoveredId) {
      this.hoveredId = found?.id ?? null
      this.options.onHover?.(found, e.clientX, e.clientY)
    } else if (found) {
      this.options.onHover?.(found, e.clientX, e.clientY)
    }
  }

  private scheduleFetch(bounds: BoundingBox) {
    const key = `${Math.floor(bounds.minX / 500)},${Math.floor(bounds.maxX / 500)},${Math.floor(bounds.minY / 500)},${Math.floor(bounds.maxY / 500)}`
    if (key === this.lastFetchBounds) return

    if (this.fetchDebounce) clearTimeout(this.fetchDebounce)
    this.fetchDebounce = setTimeout(() => {
      this.lastFetchBounds = key
      this.loadBounds({
        minX: bounds.minX - 500,
        maxX: bounds.maxX + 500,
        minY: bounds.minY - 500,
        maxY: bounds.maxY + 500,
      })
      this.options.onBoundsChange?.(bounds)
    }, 300)
  }

  private async loadBounds(bounds: BoundingBox) {
    if (!this.options.fetchConstellations) return
    try {
      const records = await this.options.fetchConstellations(bounds)
      for (const record of records) {
        this.addConstellation(record)
      }
    } catch {
      // fetch failures are non-fatal during exploration
    }
  }
}
