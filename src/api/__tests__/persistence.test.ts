import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { findEmptyPosition } from '../placement'
import { InMemoryRateLimiter, RateLimitError } from '../rateLimit'

describe('findEmptyPosition', () => {
  it('returns a position when no existing positions', () => {
    const pos = findEmptyPosition([], 90, 42)
    expect(pos).toEqual(expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }))
  })

  it('maintains minimum separation from existing positions', () => {
    const existing = [{ x: 0, y: 0 }]
    const pos = findEmptyPosition(existing, 90, 123)

    const dist = Math.hypot(pos.x, pos.y)
    expect(dist).toBeGreaterThanOrEqual(90)
  })

  it('respects custom minDistance', () => {
    const existing = [{ x: 100, y: 0 }]
    const pos = findEmptyPosition(existing, 200, 999)

    const dist = Math.hypot(pos.x - 100, pos.y)
    expect(dist).toBeGreaterThanOrEqual(200)
  })

  it('is deterministic for the same seed', () => {
    const existing = [{ x: 50, y: 50 }, { x: -30, y: 80 }]
    const a = findEmptyPosition(existing, 90, 777)
    const b = findEmptyPosition(existing, 90, 777)
    expect(a).toEqual(b)
  })
})

describe('InMemoryRateLimiter', () => {
  let limiter: InMemoryRateLimiter

  beforeEach(() => {
    vi.useFakeTimers()
    limiter = new InMemoryRateLimiter()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows the first submission', () => {
    expect(() => limiter.enforce('1.2.3.4')).not.toThrow()
  })

  it('blocks a second submission within 30 seconds', () => {
    limiter.enforce('1.2.3.4')
    expect(() => limiter.enforce('1.2.3.4')).toThrow(RateLimitError)
    expect(() => limiter.enforce('1.2.3.4')).toThrow(/30 seconds/)
  })

  it('allows a second submission after 30 seconds', () => {
    limiter.enforce('1.2.3.4')
    vi.advanceTimersByTime(31_000)
    expect(() => limiter.enforce('1.2.3.4')).not.toThrow()
  })

  it('allows submissions from different IPs', () => {
    limiter.enforce('1.2.3.4')
    expect(() => limiter.enforce('5.6.7.8')).not.toThrow()
  })

  it('blocks after 10 submissions per hour', () => {
    const ip = '10.0.0.1'
    for (let i = 0; i < 10; i++) {
      if (i > 0) vi.advanceTimersByTime(31_000)
      limiter.enforce(ip)
    }

    vi.advanceTimersByTime(31_000)
    expect(() => limiter.enforce(ip)).toThrow(/10 wishes per hour/)
  })

  it('resets hourly count after one hour', () => {
    const ip = '10.0.0.1'
    for (let i = 0; i < 10; i++) {
      if (i > 0) vi.advanceTimersByTime(31_000)
      limiter.enforce(ip)
    }

    vi.advanceTimersByTime(61 * 60 * 1000)
    expect(() => limiter.enforce(ip)).not.toThrow()
  })
})
