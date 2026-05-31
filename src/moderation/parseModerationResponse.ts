import type { ModerationDecision } from './types'

export function parseModerationResponse(response: string): ModerationDecision {
  const lines = response
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) {
    return { approved: false, reason: 'This wish cannot be added to the sky.' }
  }

  const firstLine = lines[0].toUpperCase()

  if (firstLine.startsWith('ACCEPT')) {
    return { approved: true }
  }

  if (firstLine.startsWith('REJECT')) {
    const reason =
      lines.slice(1).join(' ').trim() || 'This wish cannot be added to the sky.'
    return { approved: false, reason }
  }

  return { approved: false, reason: 'This wish cannot be added to the sky.' }
}
