const wordListRaw = await Deno.readTextFile(
  new URL('./en-slurs.txt', import.meta.url),
)

export const WORD_LIST: string[] = wordListRaw
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line.length > 0 && !line.startsWith('#'))
