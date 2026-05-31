import type { LegacyModerationResult, ModerationDecision } from './types'
import { checkOpenAIModeration } from './openaiModeration'
import { checkLanguage } from './languageDetection'
import { checkProfanity } from './profanityFilter'

export async function moderateSubmission(wish: string): Promise<ModerationDecision> {
  const trimmed = wish.trim()

  const profanity = checkProfanity(trimmed)
  if (!profanity.approved) {
    return profanity
  }

  const language = checkLanguage(trimmed)
  if (!language.approved) {
    return language
  }

  return checkOpenAIModeration(trimmed)
}

export async function moderateWish(wish: string): Promise<LegacyModerationResult> {
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

export { checkProfanity } from './profanityFilter'
export { checkLanguage } from './languageDetection'
export { checkOpenAIModeration } from './openaiModeration'
export { parseModerationResponse } from './parseModerationResponse'
export { buildModerationPrompt } from './prompts'
export type { ModerationDecision, LegacyModerationResult } from './types'
