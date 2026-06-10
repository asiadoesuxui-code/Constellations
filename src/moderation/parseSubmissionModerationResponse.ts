import type { ModerationDecision } from './types'

export type SubmissionModerationResult = {
  name: ModerationDecision
  wish: ModerationDecision
}

const DEFAULT_NAME_REJECTION = 'This name cannot be used.'
const DEFAULT_WISH_REJECTION = 'This wish cannot be added to the sky.'

function parseField(
  lines: string[],
  field: 'NAME' | 'WISH',
  defaultReason: string,
): ModerationDecision {
  const prefix = `${field}:`
  const idx = lines.findIndex((line) => line.toUpperCase().startsWith(prefix))

  if (idx === -1) {
    return { approved: false, reason: defaultReason }
  }

  const value = lines[idx].slice(prefix.length).trim().toUpperCase()

  if (value.startsWith('ACCEPT')) {
    return { approved: true }
  }

  if (value.startsWith('REJECT')) {
    const nextLine = lines[idx + 1]
    const reason =
      nextLine && !nextLine.toUpperCase().startsWith('NAME:') && !nextLine.toUpperCase().startsWith('WISH:')
        ? nextLine
        : defaultReason
    return { approved: false, reason }
  }

  return { approved: false, reason: defaultReason }
}

export function parseSubmissionModerationResponse(response: string): SubmissionModerationResult {
  const lines = response
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  return {
    name: parseField(lines, 'NAME', DEFAULT_NAME_REJECTION),
    wish: parseField(lines, 'WISH', DEFAULT_WISH_REJECTION),
  }
}
