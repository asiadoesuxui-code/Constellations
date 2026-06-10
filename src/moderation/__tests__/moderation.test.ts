import { describe, expect, it } from 'vitest'
import { checkProfanity } from '../profanityFilter'
import { checkLanguage } from '../languageDetection'
import { parseModerationResponse } from '../parseModerationResponse'
import { parseSubmissionModerationResponse } from '../parseSubmissionModerationResponse'
import { buildSubmissionModerationPrompt } from '../submissionPrompts'
import { buildModerationPrompt } from '../prompts'
import { moderateSubmission } from '../index'
import { validateFirstNameFormat, moderateName } from '../nameModeration'
import { buildNameModerationPrompt } from '../namePrompts'

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

  it('allows imperfect English from non-native speakers', () => {
    expect(checkLanguage('I wish I could do skating').approved).toBe(true)
    expect(checkLanguage('I wish I can find more happiness in life').approved).toBe(true)
    expect(checkLanguage('I hope my family be safe always').approved).toBe(true)
  })

  it('rejects gibberish', () => {
    expect(checkLanguage('asdfgh jklqwer').approved).toBe(false)
    expect(checkLanguage('zzzzzzzzzzzzz').approved).toBe(false)
  })
})

describe('parseSubmissionModerationResponse', () => {
  it('parses combined ACCEPT', () => {
    const result = parseSubmissionModerationResponse('NAME: ACCEPT\nWISH: ACCEPT')
    expect(result.name.approved).toBe(true)
    expect(result.wish.approved).toBe(true)
  })

  it('parses NAME REJECT with reason', () => {
    const result = parseSubmissionModerationResponse(
      'NAME: REJECT\nNot a real name\nWISH: ACCEPT',
    )
    expect(result.name.approved).toBe(false)
    if (!result.name.approved) {
      expect(result.name.reason).toBe('Not a real name')
    }
    expect(result.wish.approved).toBe(true)
  })

  it('parses WISH REJECT with reason', () => {
    const result = parseSubmissionModerationResponse(
      'NAME: ACCEPT\nWISH: REJECT\nThis appears to be spam.',
    )
    expect(result.name.approved).toBe(true)
    expect(result.wish.approved).toBe(false)
    if (!result.wish.approved) {
      expect(result.wish.reason).toBe('This appears to be spam.')
    }
  })
})

describe('buildSubmissionModerationPrompt', () => {
  it('includes both name and wish', () => {
    const prompt = buildSubmissionModerationPrompt('Sofia', 'I wish for peace')
    expect(prompt).toContain("FIRST NAME: 'Sofia'")
    expect(prompt).toContain("WISH: 'I wish for peace'")
    expect(prompt).toContain('NAME: ACCEPT or NAME: REJECT')
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
    expect(prompt).toContain('not perfectly natural English')
    expect(prompt).toContain('Respond with only ACCEPT or REJECT.')
  })
})

describe('validateFirstNameFormat', () => {
  it('rejects empty names', () => {
    expect(validateFirstNameFormat('').approved).toBe(false)
  })

  it('rejects names with spaces', () => {
    expect(validateFirstNameFormat('John Smith').approved).toBe(false)
  })

  it('allows international first names', () => {
    expect(validateFirstNameFormat('María').approved).toBe(true)
    expect(validateFirstNameFormat('Yuki').approved).toBe(true)
    expect(validateFirstNameFormat('Jean-Pierre').approved).toBe(true)
    expect(validateFirstNameFormat("O'Connor").approved).toBe(true)
  })

  it('rejects digits and symbols', () => {
    expect(validateFirstNameFormat('john123').approved).toBe(false)
    expect(validateFirstNameFormat('http://').approved).toBe(false)
  })
})

describe('buildNameModerationPrompt', () => {
  it('accepts names from any language', () => {
    const prompt = buildNameModerationPrompt('Yuki')
    expect(prompt).toContain("name: 'Yuki'")
    expect(prompt).toContain('any language or script')
  })
})

describe('moderateName', () => {
  it('rejects slurs', async () => {
    const result = await moderateName('fuck')
    expect(result.allowed).toBe(false)
  })

  it('approves clean international names when OpenAI is unavailable', async () => {
    const result = await moderateName('Sofia')
    expect(result.allowed).toBe(true)
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

  it('approves imperfect English wishes after local checks pass', async () => {
    const result = await moderateSubmission('I wish I could do skating')
    expect(result.approved).toBe(true)
  })
})
