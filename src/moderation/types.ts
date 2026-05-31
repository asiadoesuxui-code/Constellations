export type ModerationDecision =
  | { approved: true; needsReview?: boolean }
  | { approved: false; reason: string }

export type CheckResult = ModerationDecision

export interface LegacyModerationResult {
  allowed: boolean
  reason?: string
  failedCheck?: 'profanity' | 'language' | 'openai'
  needsReview?: boolean
}
