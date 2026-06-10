import { describe, expect, it } from 'vitest'
import { CONSTELLATION_MIN_DISTANCE } from '../placement'
import { getSeedConstellations } from '../seedConstellations'

function centroid(records: { x: number; y: number }[]): Position {
  let x = 0
  let y = 0
  for (const record of records) {
    x += record.x
    y += record.y
  }
  return { x: x / records.length, y: y / records.length }
}

interface Position {
  x: number
  y: number
}

describe('seedConstellations', () => {
  it('places seed constellations without overlap', () => {
    const records = getSeedConstellations()
    expect(records.length).toBeGreaterThan(20)

    for (let i = 0; i < records.length; i++) {
      for (let j = i + 1; j < records.length; j++) {
        const dx = records[i].x - records[j].x
        const dy = records[i].y - records[j].y
        const dist = Math.hypot(dx, dy)
        expect(dist).toBeGreaterThanOrEqual(CONSTELLATION_MIN_DISTANCE)
      }
    }
  })

  it('fills a compact natural sky patch instead of the whole map', () => {
    const records = getSeedConstellations()
    const center = centroid(records)

    const maxFromCenter = Math.max(
      ...records.map((r) => Math.hypot(r.x - center.x, r.y - center.y)),
    )
    const maxFromOrigin = Math.max(...records.map((r) => Math.hypot(r.x, r.y)))

    expect(maxFromCenter).toBeGreaterThan(1200)
    expect(maxFromCenter).toBeLessThan(3800)
    expect(maxFromOrigin).toBeLessThan(5200)
  })

  it('keeps some constellations near where the camera starts', () => {
    const records = getSeedConstellations()
    const nearStart = records.filter((r) => Math.hypot(r.x, r.y) < 3200)
    expect(nearStart.length).toBeGreaterThan(8)
  })

  it('balances constellations across left, right, up, and down', () => {
    const records = getSeedConstellations()
    const center = centroid(records)

    expect(Math.abs(center.x)).toBeLessThan(450)
    expect(Math.abs(center.y)).toBeLessThan(450)

    const left = records.filter((r) => r.x < 0).length
    const right = records.filter((r) => r.x >= 0).length
    const up = records.filter((r) => r.y < 0).length
    const down = records.filter((r) => r.y >= 0).length

    expect(left).toBeGreaterThanOrEqual(10)
    expect(right).toBeGreaterThanOrEqual(10)
    expect(up).toBeGreaterThanOrEqual(10)
    expect(down).toBeGreaterThanOrEqual(10)
  })

  it('returns a smaller evenly sampled subset when limited', () => {
    const subset = getSeedConstellations(10)
    expect(subset).toHaveLength(10)
    expect(subset.every((record) => record.id.startsWith('seed-'))).toBe(true)
  })
})
