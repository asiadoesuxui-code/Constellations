import type { ColourPalette } from '../../types/contracts'

export function hashWish(text: string): number {
  let hash = 2166136261
  const normalized = text.trim().toLowerCase()
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function deriveColourPalette(seed: number): ColourPalette {
  const palettes: ColourPalette[] = ['warm', 'cool', 'peach', 'violet']
  return palettes[seed % palettes.length]
}
