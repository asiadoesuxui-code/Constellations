import { francAll } from 'https://esm.sh/franc@6'

const NON_ENGLISH_LANGUAGES = new Set([
  'fra', 'deu', 'spa', 'ita', 'por', 'rus', 'cmn', 'jpn', 'kor', 'ara',
  'hin', 'ben', 'vie', 'pol', 'nld', 'swe', 'dan', 'nor', 'fin', 'ces',
  'slk', 'ron', 'hun', 'tur', 'ukr', 'heb', 'tha', 'ind', 'msa', 'ell',
  'bul', 'cat', 'hrv', 'srp', 'slv', 'lit', 'lav', 'est', 'fas', 'urd',
])

const ENGLISH_WISH_WORDS = new Set([
  'a', 'an', 'and', 'are', 'be', 'find', 'finds', 'for', 'friend', 'friends',
  'from', 'happiness', 'healing', 'health', 'home', 'hope', 'hopes', 'i',
  'in', 'is', 'joy', 'kindness', 'love', 'may', 'my', 'of', 'on', 'our',
  'peace', 'safe', 'see', 'sky', 'star', 'stars', 'strength', 'that', 'the',
  'to', 'together', 'us', 'we', 'wish', 'wishes', 'with', 'world', 'you',
  'your', 'dream', 'dreams', 'light', 'brighter', 'future', 'gratitude',
  'courage', 'family', 'forever', 'free', 'happiness', 'kind', 'better',
  'always', 'everyone', 'everybody', 'all', 'more', 'less', 'good', 'well',
])

function isAsciiText(text: string): boolean {
  return /^[\x20-\x7E]+$/.test(text)
}

function getLanguageScore(
  rankings: Array<[string, number]>,
  language: string,
): number {
  return rankings.find(([code]) => code === language)?.[1] ?? 0
}

function countEnglishWishWords(text: string): number {
  const tokens = text.toLowerCase().match(/[a-z']+/g) ?? []
  return tokens.filter((token) => ENGLISH_WISH_WORDS.has(token)).length
}

export function checkLanguage(text: string): { approved: boolean; reason?: string } {
  const trimmed = text.trim()

  if (trimmed.length < 3) {
    return {
      approved: false,
      reason: 'Please write a short wish in English.',
    }
  }

  const rankings = francAll(trimmed, { minLength: 3 })
  const englishScore = getLanguageScore(rankings, 'eng')
  const englishWordCount = countEnglishWishWords(trimmed)

  if (isAsciiText(trimmed) && englishWordCount >= 2) {
    return { approved: true }
  }

  for (const [language, score] of rankings.slice(0, 5)) {
    if (
      NON_ENGLISH_LANGUAGES.has(language) &&
      score >= 0.7 &&
      score > englishScore + 0.15
    ) {
      return {
        approved: false,
        reason: 'Wishes must be written in English.',
      }
    }
  }

  if (englishScore >= 0.55) {
    return { approved: true }
  }

  if (isAsciiText(trimmed) && englishWordCount >= 1 && englishScore >= 0.2) {
    return { approved: true }
  }

  if (!isAsciiText(trimmed)) {
    return {
      approved: false,
      reason: 'Wishes must be written in English.',
    }
  }

  return {
    approved: false,
    reason: 'Wishes must be written in English.',
  }
}
