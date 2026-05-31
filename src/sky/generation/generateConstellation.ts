import type { ConstellationGeometry } from '../../types/contracts'
import { getPaletteColours } from './colourPalettes'
import { connectStars } from './connectStars'
import { deriveColourPalette, hashWish } from './hashSeed'
import { SeededRandom } from './seededRandom'

export { hashWish, deriveColourPalette } from './hashSeed'

export function generateConstellation(
  seed: number,
  palette: string,
): ConstellationGeometry {
  const rng = new SeededRandom(seed)
  const starCount = 3 + Math.floor(rng.next() * 5)
  const envelopeRadius = 40 + rng.next() * 20
  const stars: ConstellationGeometry['stars'] = []

  for (let i = 0; i < starCount; i++) {
    const angle = rng.next() * Math.PI * 2
    const dist = rng.next() * envelopeRadius
    stars.push({
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      bright: rng.next() < 0.4,
    })
  }

  const edges = connectStars(stars, rng)
  const colours = getPaletteColours(palette)

  return {
    stars,
    edges,
    colour: colours.colour,
    glowColour: colours.glowColour,
  }
}

export function generateFromWish(wish: string): ConstellationGeometry & { seed: number; palette: string } {
  const seed = hashWish(wish)
  const palette = deriveColourPalette(seed)
  return { ...generateConstellation(seed, palette), seed, palette }
}
