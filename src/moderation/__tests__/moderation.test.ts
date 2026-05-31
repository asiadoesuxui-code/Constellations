import { describe, expect, it } from 'vitest'
import { checkProfanity } from '../profanityFilter'
import { checkLanguage } from '../languageDetection'
import { parseModerationResponse } from '../parseModerationResponse'
import { buildModerationPrompt } from '../prompts'
import { moderateSubmission } from '../index'

describe('profanityFilter', () => {
  it('rejects known slurs', () => {
    expect(checkProfanity('what the fuck').approved).toBe(false)
  })

  it('allows clean wishes', () => {
    expect(checkProfanity('I wish for peace and kindness').approved).toBe(true)
  })

  it('does not false-positive on substrings', () => {
    expect(checkProfanity('I wish for happiness').approved).toBe(true)
  })

  it('catches spaced obfuscation', () => {
    expect(checkProfanity('f u c k this').approved).toBe(false)
  })

  it('catches leetspeak obfuscation', () => {
    expect(checkProfanity('sh1t happens').approved).toBe(false)
  })
})

describe('languageDetection', () => {
  it('rejects very short input', () => {
    expect(checkLanguage('hi').approved).toBe(false)
  })

  it('allows short ASCII wishes', () => {
    expect(checkLanguage('I wish for love').approved).toBe(true)
  })

  it('rejects non-English text', () => {
    expect(checkLanguage('Je souhaite la paix dans le monde entier').approved).toBe(false)
  })

  it('allows English wishes', () => {
    expect(checkLanguage('I wish my family finds happiness and health').approved).toBe(true)
  })
})

describe('parseModerationResponse', () => {
  it('parses ACCEPT', () => {
    expect(parseModerationResponse('ACCEPT').approved).toBe(true)
  })

  it('parses REJECT with reason', () => {
    const result = parseModerationResponse('REJECT\nThis appears to be spam.')
    expect(result.approved).toBe(false)
    if (!result.approved) {
      expect(result.reason).toBe('This appears to be spam.')
    }
  })

  it('handles empty response', () => {
    expect(parseModerationResponse('').approved).toBe(false)
  })
})

describe('buildModerationPrompt', () => {
  it('uses the required moderation template', () => {
    const prompt = buildModerationPrompt('peace for everyone')
    expect(prompt).toContain("wish: 'peace for everyone'")
    expect(prompt).toContain("nonsense that doesn't mean anything in English")
    expect(prompt).toContain('Respond with only ACCEPT or REJECT.')
  })
})

describe('moderateSubmission', () => {
  it('returns the first failing local check', async () => {
    const result = await moderateSubmission('Je souhaite la paix')
    expect(result.approved).toBe(false)
    if (!result.approved) {
      expect(result.reason).toBe('Wishes must be written in English.')
    }
  })

  it('approves clean wishes when OpenAI is unavailable', async () => {
    const result = await moderateSubmission('I wish for kindness in the world')
    expect(result.approved).toBe(true)
    if (result.approved) {
      expect(result.needsReview).toBe(true)
    }
  })
})
