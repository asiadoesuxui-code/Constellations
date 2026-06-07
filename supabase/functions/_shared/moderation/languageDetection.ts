import { francAll } from 'https://esm.sh/franc@6'

const NON_ENGLISH_LANGUAGES = new Set([
  'fra', 'deu', 'spa', 'ita', 'por', 'rus', 'cmn', 'jpn', 'kor', 'ara',
  'hin', 'ben', 'vie', 'pol', 'nld', 'swe', 'dan', 'nor', 'fin', 'ces',
  'slk', 'ron', 'hun', 'tur', 'ukr', 'heb', 'tha', 'ind', 'msa', 'ell',
  'bul', 'cat', 'hrv', 'srp', 'slv', 'lit', 'lav', 'est', 'fas', 'urd',
])

const ENGLISH_WISH_WORDS = new Set([
  'a', 'an', 'and', 'are', 'am', 'as', 'at', 'be', 'been', 'being', 'but',
  'can', 'could', 'do', 'does', 'did', 'for', 'from', 'get', 'go', 'going',
  'had', 'has', 'have', 'he', 'her', 'him', 'his', 'i', 'if', 'in', 'is',
  'it', 'its', 'just', 'me', 'more', 'my', 'no', 'not', 'of', 'on', 'one',
  'or', 'our', 'out', 'she', 'so', 'some', 'than', 'that', 'the', 'their',
  'them', 'they', 'this', 'to', 'too', 'up', 'us', 'was', 'we', 'were',
  'what', 'when', 'who', 'will', 'with', 'would', 'you', 'your',
  'wish', 'wishes', 'wished', 'hope', 'hopes', 'hoped', 'want', 'wants',
  'wanted', 'need', 'needs', 'needed', 'love', 'loved', 'find', 'finds',
  'friend', 'friends', 'family', 'happiness', 'healing', 'health', 'home',
  'joy', 'kindness', 'peace', 'safe', 'see', 'sky', 'star', 'stars',
  'strength', 'together', 'world', 'dream', 'dreams', 'light', 'brighter',
  'future', 'gratitude', 'courage', 'forever', 'free', 'kind', 'better',
  'always', 'everyone', 'everybody', 'all', 'less', 'good', 'well', 'life',
  'live', 'learn', 'make', 'feel', 'feels', 'feeling', 'again', 'back',
  'able', 'become', 'keep', 'know', 'like', 'much', 'never', 'new', 'now',
  'over', 'own', 'really', 'still', 'there', 'thing', 'things', 'time',
  'very', 'way', 'work', 'year', 'years',
])

function isLatinScriptText(text: string): boolean {
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

function hasWishIntent(text: string): boolean {
  const lower = text.toLowerCase()
  return (
    /\bi\s+wish\b/.test(lower) ||
    /\bwish\b/.test(lower) ||
    /\bi\s+(want|hope|need|could|would|can|may)\b/.test(lower)
  )
}

function looksLikeGibberish(text: string): boolean {
  const trimmed = text.trim()

  if (/(.)\1{5,}/.test(trimmed)) return true
  if (/^[^a-zA-Z]*$/.test(trimmed)) return true

  const tokens = trimmed.toLowerCase().match(/[a-z']+/g) ?? []
  if (tokens.length === 0) return true

  if (hasWishIntent(trimmed) || countEnglishWishWords(trimmed) > 0) {
    return false
  }

  const joined = tokens.join('')
  const vowelCount = (joined.match(/[aeiou]/g) ?? []).length
  if (joined.length > 0 && vowelCount / joined.length < 0.2) return true

  const suspectTokens = tokens.filter(
    (token) => token.length >= 4 && (token.match(/[aeiou]/g) ?? []).length <= 1,
  )
  if (suspectTokens.length === tokens.length) return true

  return false
}

function isClearlyNonEnglish(text: string): boolean {
  const rankings = francAll(text, { minLength: 3 })
  const englishScore = getLanguageScore(rankings, 'eng')
  const [topLanguage, topScore] = rankings[0] ?? []

  if (
    countEnglishWishWords(text) === 0 &&
    !hasWishIntent(text) &&
    topLanguage &&
    NON_ENGLISH_LANGUAGES.has(topLanguage) &&
    topScore >= 0.6 &&
    englishScore < 0.25
  ) {
    return true
  }

  for (const [language, score] of rankings.slice(0, 3)) {
    if (
      NON_ENGLISH_LANGUAGES.has(language) &&
      score >= 0.85 &&
      englishScore < 0.1
    ) {
      return true
    }
  }

  return false
}

export function checkLanguage(text: string): { approved: boolean; reason?: string } {
  const trimmed = text.trim()

  if (trimmed.length < 3) {
    return {
      approved: false,
      reason: 'Please write a short wish.',
    }
  }

  if (looksLikeGibberish(trimmed)) {
    return {
      approved: false,
      reason: 'Please write a sincere wish.',
    }
  }

  if (isLatinScriptText(trimmed)) {
    if (hasWishIntent(trimmed) || countEnglishWishWords(trimmed) >= 1) {
      return { approved: true }
    }
  }

  if (isClearlyNonEnglish(trimmed)) {
    return {
      approved: false,
      reason: 'Wishes must be written in English.',
    }
  }

  if (isLatinScriptText(trimmed)) {
    return {
      approved: false,
      reason: 'Wishes must be written in English.',
    }
  }

  return { approved: true }
}
