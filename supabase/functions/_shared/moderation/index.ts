import { checkOpenAIModeration } from './openaiModeration.ts'
import { checkLanguage } from './languageDetection.ts'
import { checkProfanity } from './profanityFilter.ts'

export interface ModerationResult {
  allowed: boolean
  reason?: string
  failedCheck?: 'profanity' | 'language' | 'openai'
  needsReview?: boolean
}

export type ModerationDecision =
  | { approved: true; needsReview?: boolean }
  | { approved: false; reason: string }

export async function moderateSubmission(wish: string): Promise<ModerationDecision> {
  const trimmed = wish.trim()

  const profanity = checkProfanity(trimmed)
  if (!profanity.approved) {
    return { approved: false, reason: profanity.reason ?? 'This wish cannot be added to the sky.' }
  }

  const language = checkLanguage(trimmed)
  if (!language.approved) {
    return { approved: false, reason: language.reason ?? 'Wishes must be written in English.' }
  }

  return checkOpenAIModeration(trimmed)
}

export async function moderateWish(wish: string): Promise<ModerationResult> {
  const trimmed = wish.trim()

  const profanity = checkProfanity(trimmed)
  if (!profanity.approved) {
    return { allowed: false, reason: profanity.reason, failedCheck: 'profanity' }
  }

  const language = checkLanguage(trimmed)
  if (!language.approved) {
    return { allowed: false, reason: language.reason, failedCheck: 'language' }
  }

  const openai = await checkOpenAIModeration(trimmed)
  if (!openai.approved) {
    return { allowed: false, reason: openai.reason, failedCheck: 'openai' }
  }

  return { allowed: true, needsReview: openai.needsReview }
}

export { checkProfanity } from './profanityFilter.ts'
export { checkLanguage } from './languageDetection.ts'
export { checkOpenAIModeration } from './openaiModeration.ts'
export { parseModerationResponse } from './parseModerationResponse.ts'
export { buildModerationPrompt } from './prompts.ts'
