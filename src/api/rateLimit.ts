export class RateLimitError extends Error {
  readonly code = 'rate_limit' as const

  constructor(message: string) {
    super(message)
    this.name = 'RateLimitError'
  }
}

interface IpRecord {
  lastSubmissionAt: number
  hourlyCount: number
  hourWindowStart: number
}

const MIN_INTERVAL_MS = 30_000
const MAX_HOURLY = 10
const HOUR_MS = 60 * 60 * 1000

export class InMemoryRateLimiter {
  private records = new Map<string, IpRecord>()

  check(ip: string): void {
    const now = Date.now()
    const existing = this.records.get(ip)

    if (existing) {
      const secondsSince = (now - existing.lastSubmissionAt) / 1000
      if (secondsSince < MIN_INTERVAL_MS / 1000) {
        throw new RateLimitError('Please wait 30 seconds before sending another wish.')
      }

      const hoursSinceWindow = (now - existing.hourWindowStart) / HOUR_MS
      if (hoursSinceWindow < 1 && existing.hourlyCount >= MAX_HOURLY) {
        throw new RateLimitError(
          'You have reached the limit of 10 wishes per hour. Please try again later.',
        )
      }
    }
  }

  record(ip: string): void {
    const now = Date.now()
    const existing = this.records.get(ip)

    if (existing) {
      const hoursSinceWindow = (now - existing.hourWindowStart) / HOUR_MS
      const newCount = hoursSinceWindow >= 1 ? 1 : existing.hourlyCount + 1
      const newWindowStart = hoursSinceWindow >= 1 ? now : existing.hourWindowStart

      this.records.set(ip, {
        lastSubmissionAt: now,
        hourlyCount: newCount,
        hourWindowStart: newWindowStart,
      })
    } else {
      this.records.set(ip, {
        lastSubmissionAt: now,
        hourlyCount: 1,
        hourWindowStart: now,
      })
    }
  }

  /** Check limits and record a submission atomically. Throws RateLimitError when exceeded. */
  enforce(ip: string): void {
    this.check(ip)
    this.record(ip)
  }

  reset(): void {
    this.records.clear()
  }
}

export const rateLimiter = new InMemoryRateLimiter()

export function checkRateLimit(ip: string): void {
  rateLimiter.enforce(ip)
}

export function peekRateLimit(ip: string): void {
  rateLimiter.check(ip)
}
