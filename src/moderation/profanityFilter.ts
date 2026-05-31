import { WORD_LIST } from './wordlists/wordList'
import type { CheckResult } from './types'

const REJECTION_REASON =
  'Your wish contains language that cannot be added to the sky.'

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function applyLeetSpeak(text: string): string {
  return text
    .replace(/0/g, 'o')
    .replace(/[1!|]/g, 'i')
    .replace(/3/g, 'e')
    .replace(/[4@]/g, 'a')
    .replace(/[5$]/g, 's')
    .replace(/7/g, 't')
}

function buildTextVariants(text: string): string[] {
  const lower = text.toLowerCase()
  const leet = applyLeetSpeak(lower)
  const stripped = leet.replace(/[^a-z0-9\s]/g, ' ')
  const collapsed = stripped.replace(/\s+/g, ' ').trim()
  const despaced = collapsed.replace(/\s/g, '')

  return [lower, leet, collapsed, despaced]
}

function matchesBlockedTerm(text: string, term: string): boolean {
  const normalizedTerm = term.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
  const despacedTerm = normalizedTerm.replace(/\s/g, '')

  if (!normalizedTerm) {
    return false
  }

  const escaped = escapeRegex(normalizedTerm)
  const wordPattern = new RegExp(`\\b${escaped}\\b`, 'i')
  const boundaryPattern = new RegExp(`(?:^|[^a-z0-9])${escapeRegex(despacedTerm)}(?:[^a-z0-9]|$)`, 'i')

  for (const variant of buildTextVariants(text)) {
    if (wordPattern.test(variant)) {
      return true
    }

    if (despacedTerm.length >= 3 && boundaryPattern.test(variant.replace(/\s/g, ''))) {
      return true
    }
  }

  return false
}

export function checkProfanity(text: string): CheckResult {
  for (const term of WORD_LIST) {
    if (matchesBlockedTerm(text, term)) {
      return { approved: false, reason: REJECTION_REASON }
    }
  }

  return { approved: true }
}
