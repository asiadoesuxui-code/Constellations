import { checkProfanity } from './profanityFilter.ts'
import { checkOpenAIModeration } from './openaiModeration.ts'
import { buildNameModerationPrompt } from './namePrompts.ts'

const MAX_NAME_LENGTH = 30

const FIRST_NAME_RE = /^[\p{L}](?:[\p{L}'-]{0,28}[\p{L}])?$/u

type CheckResult =
  | { approved: true }
  | { approved: false; reason: string }

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

export async function moderateName(name: string): Promise<{
  allowed: boolean
  reason?: string
  failedCheck?: 'format' | 'profanity' | 'openai'
  needsReview?: boolean
}> {
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

  const openai = await checkOpenAIModeration(trimmed, buildNameModerationPrompt)
  if (!openai.approved) {
    return { allowed: false, reason: openai.reason, failedCheck: 'openai' }
  }

  return { allowed: true, needsReview: openai.needsReview }
}
