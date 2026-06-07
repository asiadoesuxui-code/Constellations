import { describe, expect, it } from 'vitest'
import { CONSTELLATION_MIN_DISTANCE } from '../placement'
import { getSeedConstellations } from '../seedConstellations'

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

  it('spreads seeds across near and far regions', () => {
    const records = getSeedConstellations()
    const nearOrigin = records.filter((r) => Math.hypot(r.x, r.y) < 2500)
    const farAway = records.filter((r) => Math.hypot(r.x, r.y) > 8000)

    expect(nearOrigin.length).toBeGreaterThan(0)
    expect(farAway.length).toBeGreaterThan(0)
  })
})
