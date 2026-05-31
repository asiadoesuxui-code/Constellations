import type { ColourPalette } from '../../types/contracts'

export interface PaletteColours {
  colour: string
  glowColour: string
}

const PALETTES: Record<ColourPalette, PaletteColours> = {
  warm: { colour: '#f5e6cc', glowColour: 'rgba(245, 230, 204, 0.55)' },
  cool: { colour: '#e8edf5', glowColour: 'rgba(200, 210, 230, 0.5)' },
  peach: { colour: '#f0dcc8', glowColour: 'rgba(240, 200, 170, 0.5)' },
  violet: { colour: '#ede0f5', glowColour: 'rgba(210, 190, 230, 0.5)' },
}

export function getPaletteColours(palette: ColourPalette | string): PaletteColours {
  return PALETTES[palette as ColourPalette] ?? PALETTES.warm
}
