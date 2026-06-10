import { Application, Container } from 'pixi.js'
import { CONSTELLATION_MIN_DISTANCE } from '../../api/placement'
import { getSeedConstellations, isSeedConstellationId, AMBIENT_SEED_COUNT } from '../../api/seedConstellations'
import { isSupabaseConfigured } from '../../lib/supabase/client'
import type { BoundingBox, ConstellationLabelTarget, ConstellationRecord, SkyCaptureResult } from '../../types/contracts'
import { recordFromWish } from '../skyApi'
import { cameraPanDurationMs, CameraController } from '../camera/CameraController'
import { IdleDrift } from '../camera/idleDrift'
import { PanZoomHandler } from '../camera/PanZoomHandler'
import { SpatialGrid } from '../culling/spatialGrid'
import { ViewportCuller } from '../culling/ViewportCuller'
import {
  createConstellationSprite,
  getLabelDisplayOpacity,
  updateConstellationLineZoom,
  updateConstellationTwinkle,
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
import {
  getRevealEnvironmentDim,
  getRevealEnvironmentRestoreMultiplier,
  REVEAL_ENV_RESTORE_MS,
} from '../animations/constellationReveal'
import { preloadConstellationAssets } from '../renderer/constellationAssets'
import { createNebulaLayer } from '../renderer/NebulaLayer'
import { createTiledBackground } from '../renderer/SkyBackground'
import { drawCaptureLabels } from './drawCaptureLabels'

const INITIAL_LOAD_RADIUS = 2800

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
  private nebulaLayer?: Container
  private landingLayer?: Container
  private backgroundBaseAlpha = 1
  private revealEnvRestore: { startMs: number } | null = null
  private viewMode: SkyViewMode = 'landing'
  private options: SkyRendererOptions
  private lastFetchBounds: string | null = null
  private fetchDebounce: ReturnType<typeof setTimeout> | null = null
  private addingIds = new Set<string>()
  private fetchEnabled = false
  private initialFetchDone = false
  private pendingUserFetch = false
  private ownConstellationId: string | null = null
  private hoveredId: string | null = null
  private clickStart: { x: number; y: number; pointerId: number } | null = null
  private focusing = false
  private destroyed = false
  private initGeneration = 0
  private canvasElement: HTMLCanvasElement | null = null
  private appInitialized = false
  private canvasListenersAttached = false

  constructor(options: SkyRendererOptions = {}) {
    this.options = options
  }

  async init(canvas: HTMLCanvasElement): Promise<boolean> {
    const generation = ++this.initGeneration
    this.canvasElement = canvas
    this.resetSceneGraph()

    try {
      const mobile = window.matchMedia('(max-width: 768px)').matches
      this.app = new Application()
      await this.app.init({
        canvas,
        resizeTo: window,
        background: 0x0a0a0a,
        backgroundAlpha: 1,
        antialias: true,
        resolution: Math.min(window.devicePixelRatio, 2),
        autoDensity: true,
        preferWebGLVersion: 2,
      })

      if (this.shouldAbortInit(generation)) return false

      if (this.app.screen.width < 1 || this.app.screen.height < 1) {
        const width = canvas.clientWidth || window.innerWidth
        const height = canvas.clientHeight || window.innerHeight
        this.app.renderer.resize(Math.max(1, width), Math.max(1, height))
      }

      // Paint the dark background immediately so the canvas never flashes white.
      this.app.renderer.render(this.app.stage)

      this.app.stage.addChild(this.worldLayer)
      this.backgroundLayer = createTiledBackground(this.worldLayer)
      this.nebulaLayer = createNebulaLayer(this.worldLayer)
      this.ambientLayer = createAmbientStarsLayer(
        this.worldLayer,
        this.app.screen.width,
        this.app.screen.height,
        mobile,
      )

      try {
        this.landingLayer = await createLandingDecorations(
          this.worldLayer,
          this.app.screen.width,
          this.app.screen.height,
        )
      } catch {
        this.landingLayer = new Container()
        this.landingLayer.visible = false
      }

      if (this.shouldAbortInit(generation)) return false

      this.worldLayer.addChild(this.constellationLayer)
      this.loadSeedConstellations()

      this.panZoom = new PanZoomHandler(canvas, this.camera, () => this.onUserInteraction())
      this.attachCanvasListeners(canvas)

      this.appInitialized = true

      this.app.ticker.add((ticker) => {
        if (!this.appInitialized) return
        const deltaMs = Math.min(ticker.deltaMS, 100)
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
        const nowMs = performance.now()
        const zoom = this.camera.zoom
        for (const visual of this.visuals.values()) {
          updateConstellationTwinkle(visual, nowMs, deltaMs, zoom)
          updateConstellationLineZoom(visual, zoom)
        }
        this.updateRevealEnvironment(nowMs)
        const bounds = this.camera.getBounds(this.app.screen.width, this.app.screen.height)
        this.culler.update(this.visuals, bounds, deltaMs, this.ownConstellationId)
        this.scheduleFetch(bounds)
      })

      this.camera.applyToContainer(
        this.worldLayer,
        this.app.screen.width,
        this.app.screen.height,
      )
      this.app.renderer.render(this.app.stage)
      if (this.fetchEnabled) {
        void this.performInitialFetch()
      }
      return true
    } catch {
      this.teardownInitAttempt()
      return false
    }
  }

  private resetSceneGraph(): void {
    this.worldLayer = new Container()
    this.constellationLayer = new Container()
    this.visuals.clear()
    this.backgroundLayer = undefined
    this.nebulaLayer = undefined
    this.landingLayer = undefined
    this.ambientLayer = undefined
    this.spatialGrid = new SpatialGrid()
  }

  private isInitStale(generation: number): boolean {
    return this.destroyed || generation !== this.initGeneration
  }

  private shouldAbortInit(generation: number): boolean {
    if (!this.isInitStale(generation)) return false
    this.teardownInitAttempt()
    return true
  }

  private teardownInitAttempt(): void {
    this.detachCanvasListeners()
    this.panZoom?.destroy()
    this.panZoom = undefined
    this.destroyApp()
  }

  private attachCanvasListeners(canvas: HTMLCanvasElement): void {
    if (this.canvasListenersAttached) return
    canvas.addEventListener('pointerdown', this.handlePointerDown)
    canvas.addEventListener('pointerup', this.handlePointerUp)
    canvas.addEventListener('pointermove', this.handleHover)
    canvas.addEventListener('pointerleave', this.handlePointerLeave)
    canvas.addEventListener('wheel', this.onUserInteraction, { passive: true })
    this.canvasListenersAttached = true
  }

  private detachCanvasListeners(): void {
    const canvas = this.canvasElement
    if (!canvas || !this.canvasListenersAttached) return
    canvas.removeEventListener('pointerdown', this.handlePointerDown)
    canvas.removeEventListener('pointerup', this.handlePointerUp)
    canvas.removeEventListener('pointermove', this.handleHover)
    canvas.removeEventListener('pointerleave', this.handlePointerLeave)
    canvas.removeEventListener('wheel', this.onUserInteraction)
    this.canvasListenersAttached = false
  }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    this.initGeneration++
    this.panZoom?.destroy()
    this.panZoom = undefined
    if (this.fetchDebounce) clearTimeout(this.fetchDebounce)
    this.detachCanvasListeners()
    this.canvasElement = null
    this.destroyApp()
  }

  private destroyApp(): void {
    if (!this.app?.renderer) return
    try {
      // Keep the canvas element so React can re-init WebGL on the same node.
      this.app.destroy(false, { children: true })
    } catch {
      // App may be partially initialized during remount.
    }
    this.appInitialized = false
  }

  async placeNewConstellation(wish: string, x: number, y: number): Promise<void> {
    await this.revealConstellation(recordFromWish(wish, x, y))
  }

  loadConstellationsFromData(constellations: ConstellationRecord[]): void {
    for (const record of constellations) {
      void this.addConstellation(record)
    }
  }

  private loadSeedConstellations(): void {
    const limit = isSupabaseConfigured() ? AMBIENT_SEED_COUNT : undefined
    for (const record of getSeedConstellations(limit)) {
      void this.addConstellation(record)
    }
  }

  setOnHover(
    handler: (record: ConstellationRecord | null, screenX: number, screenY: number) => void,
  ): void {
    this.options.onHover = handler
  }

  setViewMode(mode: SkyViewMode): void {
    if (this.viewMode === mode) return
    const wasLanding = this.viewMode === 'landing'
    this.viewMode = mode

    if (wasLanding && mode === 'exploring') {
      this.lastFetchBounds = null
    }

    if (this.landingLayer) {
      this.landingLayer.visible = mode === 'landing'
    }

    this.backgroundBaseAlpha = mode === 'landing' ? 1 : 0.62
    if (this.backgroundLayer) {
      this.backgroundLayer.alpha = this.backgroundBaseAlpha
    }

    this.ambientLayer?.setViewMode(mode)
  }

  setFetchEnabled(enabled: boolean): void {
    this.fetchEnabled = enabled
    if (!enabled) {
      this.pendingUserFetch = false
      this.initialFetchDone = false
      if (this.fetchDebounce) clearTimeout(this.fetchDebounce)
      return
    }
    this.lastFetchBounds = null
    if (this.appInitialized && !this.initialFetchDone) {
      void this.performInitialFetch()
    }
  }

  setOwnConstellationId(id: string | null): void {
    this.ownConstellationId = id
  }

  private onUserInteraction = (): void => {
    this.idleDrift.reset()
    if (this.fetchEnabled) {
      this.pendingUserFetch = true
    }
  }

  getConstellationPositions(): { x: number; y: number }[] {
    return this.spatialGrid.getAll().map(({ x, y }) => ({ x, y }))
  }

  private isTooCloseToExisting(x: number, y: number, excludeId?: string): boolean {
    const minDistSq = CONSTELLATION_MIN_DISTANCE * CONSTELLATION_MIN_DISTANCE
    for (const existing of this.spatialGrid.getAll()) {
      if (excludeId && existing.id === excludeId) continue
      const dx = existing.x - x
      const dy = existing.y - y
      if (dx * dx + dy * dy < minDistSq) return true
    }
    return false
  }

  async addConstellation(
    record: ConstellationRecord,
    options: {
      twinkleStartMs?: number
      twinkleFromReveal?: boolean
      animateReveal?: boolean
      onRevealComplete?: () => void
    } = {},
  ): Promise<void> {
    if (this.spatialGrid.has(record.id) || this.addingIds.has(record.id)) return
    if (record.id !== this.ownConstellationId && !isSeedConstellationId(record.id)) {
      for (const existing of this.spatialGrid.getAll()) {
        if (isSeedConstellationId(existing.id)) continue
        if (existing.seed === record.seed) return
      }
    }
    if (this.isTooCloseToExisting(record.x, record.y, record.id)) return

    this.addingIds.add(record.id)
    this.spatialGrid.add(record)
    try {
      const visual = await createConstellationSprite(record, {
        twinkleStartMs: options.twinkleStartMs,
        twinkleFromReveal: options.twinkleFromReveal,
        animateReveal: options.animateReveal,
        onRevealComplete: options.onRevealComplete,
        isOwn: record.id === this.ownConstellationId,
      })
      if (this.visuals.has(record.id)) {
        visual.container.destroy({ children: true })
        return
      }
      const existingChild = this.constellationLayer.children.find(
        (child) => child.label === record.id,
      )
      if (existingChild) {
        visual.container.destroy({ children: true })
        return
      }
      this.visuals.set(record.id, visual)
      this.constellationLayer.addChild(visual.container)
      const zoom = this.camera.zoom
      updateConstellationTwinkle(visual, performance.now(), 0, zoom)
      updateConstellationLineZoom(visual, zoom)
    } catch {
      this.spatialGrid.remove(record.id)
    } finally {
      this.addingIds.delete(record.id)
    }
  }

  async revealConstellation(record: ConstellationRecord): Promise<void> {
    this.idleDrift.pause()
    this.revealEnvRestore = null
    let resolveReveal!: () => void
    const revealComplete = new Promise<void>((resolve) => {
      resolveReveal = resolve
    })

    const panDurationMs = 2800
    const revealOverlapMs = 500
    const revealZoom = record.id === this.ownConstellationId ? 1.65 : 1
    const panPromise = this.camera.panTo(record.x, record.y, panDurationMs, revealZoom)

    const revealLeadMs = Math.max(0, panDurationMs - revealOverlapMs)
    await Promise.all([
      preloadConstellationAssets(),
      new Promise<void>((resolve) => setTimeout(resolve, revealLeadMs)),
    ])

    const startMs = performance.now()
    await this.addConstellation(record, {
      twinkleStartMs: startMs,
      twinkleFromReveal: true,
      animateReveal: true,
      onRevealComplete: () => {
        this.revealEnvRestore = { startMs: performance.now() }
        resolveReveal()
      },
    })
    await Promise.all([revealComplete, panPromise])
    this.idleDrift.resume()
  }

  private applyRevealEnvironmentDim(multiplier: number): void {
    this.ambientLayer?.setRevealDim(multiplier)
    if (this.nebulaLayer) {
      this.nebulaLayer.alpha = multiplier
    }
    if (this.backgroundLayer) {
      const bgMult = 0.9 + multiplier * 0.1
      this.backgroundLayer.alpha = this.backgroundBaseAlpha * bgMult
    }
  }

  private updateRevealEnvironment(nowMs: number): void {
    for (const visual of this.visuals.values()) {
      if (visual.reveal && !visual.reveal.complete) {
        const elapsed = nowMs - visual.reveal.startMs
        this.applyRevealEnvironmentDim(getRevealEnvironmentDim(elapsed))
        return
      }
    }

    if (this.revealEnvRestore) {
      const elapsed = nowMs - this.revealEnvRestore.startMs
      this.applyRevealEnvironmentDim(
        getRevealEnvironmentRestoreMultiplier(this.revealEnvRestore.startMs, nowMs),
      )
      if (elapsed >= REVEAL_ENV_RESTORE_MS) {
        this.revealEnvRestore = null
        this.applyRevealEnvironmentDim(1)
      }
      return
    }

    this.applyRevealEnvironmentDim(1)
  }

  async focusConstellation(record: ConstellationRecord): Promise<void> {
    if (this.viewMode !== 'exploring' || this.focusing) return

    const baseFocusZoom = this.camera.zoom < 0.92 ? 1 : Math.max(this.camera.zoom, 1)
    const focusZoom = Math.min(this.camera.maxZoom, baseFocusZoom * 2)
    const focusDurationMs = cameraPanDurationMs(
      this.camera.x,
      this.camera.y,
      this.camera.zoom,
      record.x,
      record.y,
      focusZoom,
    )
    this.focusing = true
    this.idleDrift.pause()
    this.onUserInteraction()
    try {
      await this.camera.panTo(record.x, record.y, focusDurationMs, focusZoom)
    } finally {
      this.focusing = false
      this.idleDrift.resume()
    }
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

  captureConstellationSky(
    constellationId: string,
    orientation: 'landscape' | 'portrait',
  ): SkyCaptureResult | null {
    if (!this.appInitialized) return null

    const visual = this.visuals.get(constellationId)
    if (!visual) return null

    this.app.renderer.render(this.app.stage)

    const screenW = this.app.screen.width
    const screenH = this.app.screen.height
    const resolution = this.app.renderer.resolution
    const aspect = orientation === 'landscape' ? 16 / 9 : 3 / 4
    const zoom = this.camera.zoom

    const bounds = visual.container.getBounds()
    let rawX = bounds.x
    let rawY = bounds.y
    let rawRight = bounds.x + bounds.width
    let rawBottom = bounds.y + bounds.height

    const ownLabel = this.getConstellationLabels().find((l) => l.id === constellationId)
    if (ownLabel) {
      const labelBounds = this.getLabelScreenBounds(ownLabel, zoom)
      rawX = Math.min(rawX, labelBounds.x)
      rawY = Math.min(rawY, labelBounds.y)
      rawRight = Math.max(rawRight, labelBounds.right)
      rawBottom = Math.max(rawBottom, labelBounds.bottom)
    }

    const edgePad = 14
    rawX -= edgePad
    rawY -= edgePad
    rawRight += edgePad
    rawBottom += edgePad

    const contentW = rawRight - rawX
    const contentH = rawBottom - rawY
    if (contentW <= 0 || contentH <= 0) return null

    let cropW = contentW
    let cropH = contentH
    if (cropW / cropH < aspect) {
      cropW = cropH * aspect
    } else {
      cropH = cropW / aspect
    }

    if (cropW > screenW) {
      const scale = screenW / cropW
      cropW = screenW
      cropH *= scale
    }
    if (cropH > screenH) {
      const scale = screenH / cropH
      cropH = screenH
      cropW *= scale
    }

    const centerX = (rawX + rawRight) / 2
    const centerY = (rawY + rawBottom) / 2
    let cropX = centerX - cropW / 2
    let cropY = centerY - cropH / 2
    cropX = Math.max(0, Math.min(cropX, screenW - cropW))
    cropY = Math.max(0, Math.min(cropY, screenH - cropH))

    const source = this.app.canvas as HTMLCanvasElement
    const outW = Math.max(1, Math.round(cropW * resolution))
    const outH = Math.max(1, Math.round(cropH * resolution))

    const output = document.createElement('canvas')
    output.width = outW
    output.height = outH
    const ctx = output.getContext('2d')
    if (!ctx) return null

    ctx.drawImage(
      source,
      Math.round(cropX * resolution),
      Math.round(cropY * resolution),
      outW,
      outH,
      0,
      0,
      outW,
      outH,
    )

    drawCaptureLabels(ctx, this.getConstellationLabels(), {
      cropX,
      cropY,
      cropW,
      cropH,
      outW,
      outH,
      zoom,
    })

    return {
      dataUrl: output.toDataURL('image/png'),
      width: cropW,
      height: cropH,
    }
  }

  private getLabelScreenBounds(
    label: ConstellationLabelTarget,
    zoom: number,
  ): { x: number; y: number; right: number; bottom: number } {
    const showWish = zoom >= 0.7 && Boolean(label.wish.trim())
    const wishH = showWish ? 25 : 0
    const nameH = 17
    const gap = showWish ? 4.8 : 0
    const height = wishH + gap + nameH
    const halfW = 140

    return {
      x: label.screenX - halfW,
      y: label.screenY - height,
      right: label.screenX + halfW,
      bottom: label.screenY,
    }
  }

  getConstellationLabels(): ConstellationLabelTarget[] {
    if (!this.appInitialized) return []

    const screenW = this.app.screen.width
    const screenH = this.app.screen.height
    const labels: ConstellationLabelTarget[] = []

    const nowMs = performance.now()
    for (const visual of this.visuals.values()) {
      if (!visual.renderable || visual.alpha < 0.08) continue
      if (!visual.record.name || !visual.showLabel) continue

      const labelOpacity = getLabelDisplayOpacity(visual, nowMs)
      if (labelOpacity < 0.02) continue

      const labelWorldY = visual.record.y + visual.labelAnchorY
      const screen = this.camera.worldToScreen(
        visual.record.x,
        labelWorldY,
        screenW,
        screenH,
      )

      labels.push({
        id: visual.record.id,
        name: visual.record.name,
        wish: visual.record.wish,
        screenX: screen.x,
        screenY: screen.y,
        opacity: labelOpacity,
        isOwn: visual.record.id === this.ownConstellationId,
      })
    }

    return labels
  }

  private handlePointerLeave = (): void => {
    this.clickStart = null
    if (this.canvasElement) this.canvasElement.style.cursor = ''
    if (this.hoveredId === null) return
    this.hoveredId = null
    this.options.onHover?.(null, 0, 0)
  }

  private handlePointerDown = (e: PointerEvent): void => {
    if (this.viewMode !== 'exploring' || e.button !== 0) return
    this.clickStart = { x: e.clientX, y: e.clientY, pointerId: e.pointerId }
  }

  private handlePointerUp = (e: PointerEvent): void => {
    if (!this.clickStart || this.clickStart.pointerId !== e.pointerId) return

    const dx = e.clientX - this.clickStart.x
    const dy = e.clientY - this.clickStart.y
    this.clickStart = null

    if (dx * dx + dy * dy > 100) return
    if (this.viewMode !== 'exploring') return

    const record = this.findConstellationAtScreen(e.clientX, e.clientY)
    if (record) void this.focusConstellation(record)
  }

  private findConstellationAtScreen(clientX: number, clientY: number): ConstellationRecord | null {
    if (!this.appInitialized || !this.canvasElement) return null

    const rect = this.canvasElement.getBoundingClientRect()
    const world = this.camera.screenToWorld(
      clientX - rect.left,
      clientY - rect.top,
      this.app.screen.width,
      this.app.screen.height,
    )

    let found: ConstellationRecord | null = null
    let bestDistSq = Infinity

    for (const visual of this.visuals.values()) {
      if (!visual.renderable || visual.alpha < 0.1) continue
      const dx = world.x - visual.record.x
      const dy = world.y - visual.record.y
      const distSq = dx * dx + dy * dy
      const hitRadiusSq = visual.hitRadius * visual.hitRadius
      if (distSq <= hitRadiusSq && distSq < bestDistSq) {
        bestDistSq = distSq
        found = visual.record
      }
    }

    return found
  }

  private handleHover = (e: PointerEvent) => {
    if (!this.appInitialized) return
    const canvas = this.canvasElement
    if (!canvas) return

    const found = this.findConstellationAtScreen(e.clientX, e.clientY)
    const canFocus = this.viewMode === 'exploring'

    canvas.style.cursor = found && canFocus ? 'pointer' : ''

    if (found?.id !== this.hoveredId) {
      this.hoveredId = found?.id ?? null
      this.options.onHover?.(found, e.clientX, e.clientY)
    } else if (found) {
      this.options.onHover?.(found, e.clientX, e.clientY)
    }
  }

  private scheduleFetch(bounds: BoundingBox) {
    if (!this.fetchEnabled || !this.pendingUserFetch) return

    const key = `${Math.floor(bounds.minX / 500)},${Math.floor(bounds.maxX / 500)},${Math.floor(bounds.minY / 500)},${Math.floor(bounds.maxY / 500)}`
    if (key === this.lastFetchBounds) return

    if (this.fetchDebounce) clearTimeout(this.fetchDebounce)
    this.fetchDebounce = setTimeout(() => {
      void this.loadBounds(
        {
          minX: bounds.minX - 500,
          maxX: bounds.maxX + 500,
          minY: bounds.minY - 500,
          maxY: bounds.maxY + 500,
        },
        key,
        bounds,
      )
    }, 300)
  }

  private async performInitialFetch(): Promise<void> {
    if (this.initialFetchDone || !this.fetchEnabled || !this.options.fetchConstellations) return
    if (!this.appInitialized) return

    const width = this.app.screen.width
    const height = this.app.screen.height
    if (width < 1 || height < 1) {
      requestAnimationFrame(() => void this.performInitialFetch())
      return
    }

    const cx = this.camera.x
    const cy = this.camera.y
    const loaded = await this.loadBounds(
      {
        minX: cx - INITIAL_LOAD_RADIUS,
        maxX: cx + INITIAL_LOAD_RADIUS,
        minY: cy - INITIAL_LOAD_RADIUS,
        maxY: cy + INITIAL_LOAD_RADIUS,
      },
      'initial',
      this.camera.getBounds(width, height),
    )
    if (loaded) this.initialFetchDone = true
  }

  private async loadBounds(
    bounds: BoundingBox,
    boundsKey: string,
    viewportBounds: BoundingBox,
  ): Promise<boolean> {
    if (!this.options.fetchConstellations) return false
    try {
      const records = await this.options.fetchConstellations(bounds)
      for (const record of records) {
        if (record.id === this.ownConstellationId) continue
        await this.addConstellation(record)
      }
      this.lastFetchBounds = boundsKey
      this.pendingUserFetch = false
      this.options.onBoundsChange?.(viewportBounds)
      return true
    } catch (err) {
      console.error('[PixiSkyRenderer] failed to load constellations:', err)
      return false
    }
  }
}
