import { describe, expect, it } from 'vitest'
import { getSeedConstellations } from '../../../api/seedConstellations'
import { generateConstellation, shapeSignature } from '../generateConstellation'

function pathSpan(stars: { x: number; y: number }[]): number {
  let max = 0
  for (let i = 0; i < stars.length; i++) {
    for (let j = i + 1; j < stars.length; j++) {
      max = Math.max(max, Math.hypot(stars[i].x - stars[j].x, stars[i].y - stars[j].y))
    }
  }
  return max
}

function aspectRatio(stars: { x: number; y: number }[]): number {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const s of stars) {
    minX = Math.min(minX, s.x)
    maxX = Math.max(maxX, s.x)
    minY = Math.min(minY, s.y)
    maxY = Math.max(maxY, s.y)
  }
  const w = maxX - minX
  const h = maxY - minY
  if (w === 0 || h === 0) return 1
  return Math.max(w, h) / Math.min(w, h)
}

describe('generateConstellation', () => {
  it('keeps constellations within a compact span', () => {
    for (let seed = 1; seed < 200; seed++) {
      const geometry = generateConstellation(seed, 'warm')
      const span = pathSpan(geometry.stars)
      expect(span).toBeGreaterThanOrEqual(145)
      expect(span).toBeLessThanOrEqual(290)
    }
  })

  it('gives every seed constellation a unique shape', () => {
    const signatures = new Set<string>()
    for (const record of getSeedConstellations()) {
      const geometry = generateConstellation(record.seed, record.colour_palette)
      const sig = shapeSignature(geometry)
      expect(signatures.has(sig)).toBe(false)
      signatures.add(sig)
    }
    expect(signatures.size).toBe(getSeedConstellations().length)
  })

  it('avoids elongated straight-line silhouettes', () => {
    for (let seed = 1; seed < 200; seed++) {
      const geometry = generateConstellation(seed, 'warm')
      expect(aspectRatio(geometry.stars)).toBeLessThanOrEqual(2.5)
    }
  })

  it('avoids degenerate two-edge X silhouettes', () => {
    for (const record of getSeedConstellations()) {
      const geometry = generateConstellation(record.seed, record.colour_palette)
      const hub = new Map<number, number>()
      for (const [a, b] of geometry.edges) {
        hub.set(a, (hub.get(a) ?? 0) + 1)
        hub.set(b, (hub.get(b) ?? 0) + 1)
      }
      const maxDegree = Math.max(...hub.values())
      expect(geometry.edges.length).toBeGreaterThan(3)
      expect(maxDegree).toBeLessThanOrEqual(4)
    }
  })
})
