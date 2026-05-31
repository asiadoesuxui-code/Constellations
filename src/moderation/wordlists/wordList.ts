import wordListRaw from './en-slurs.txt?raw'

export const WORD_LIST: string[] = wordListRaw
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line.length > 0 && !line.startsWith('#'))
