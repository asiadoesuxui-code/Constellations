import { checkProfanity } from './profanityFilter'
import { checkOpenAIModeration } from './openaiModeration'
import { buildNameModerationPrompt } from './namePrompts'
import type { CheckResult, LegacyModerationResult } from './types'

const MAX_NAME_LENGTH = 30

// Letters from any script; optional internal hyphen or apostrophe (Jean-Pierre, O'Connor).
const FIRST_NAME_RE = /^[\p{L}](?:[\p{L}'-]{0,28}[\p{L}])?$/u

export function validateFirstNameFormat(name: string): CheckResult {
  const trimmed = name.trim()

  if (!trimmed) {
    return { approved: false, reason: 'Please enter your first name.' }
  }

  if (/\s/.test(trimmed)) {
    return { approved: false, reason: 'Please enter only your first name.' }
  }

  if (trimmed.length > MAX_NAME_LENGTH) {
    return { approved: false, reason: 'First name is too long.' }
  }

  if (!FIRST_NAME_RE.test(trimmed)) {
    return { approved: false, reason: 'Please enter a valid first name.' }
  }

  return { approved: true }
}

export async function moderateName(name: string): Promise<LegacyModerationResult> {
  const trimmed = name.trim()

  const format = validateFirstNameFormat(trimmed)
  if (!format.approved) {
    return { allowed: false, reason: format.reason, failedCheck: 'format' }
  }

  const profanity = checkProfanity(trimmed)
  if (!profanity.approved) {
    return {
      allowed: false,
      reason: 'This name contains language that cannot be used.',
      failedCheck: 'profanity',
    }
  }

  const openai = await checkOpenAIModeration(trimmed, {
    buildPrompt: buildNameModerationPrompt,
  })
  if (!openai.approved) {
    return { allowed: false, reason: openai.reason, failedCheck: 'openai' }
  }

  return { allowed: true, needsReview: openai.needsReview }
}
