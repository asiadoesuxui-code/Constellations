import { findEmptyPosition, hashWish } from './hash.ts'

interface Position {
  x: number
  y: number
}

interface SeedEntry {
  name: string
  wish: string
}

const CONSTELLATION_MIN_DISTANCE = 360

const PLACEMENT_SECTORS: Position[] = [
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 1800, y: 600 },
  { x: -1500, y: 1200 },
  { x: 1200, y: -1600 },
  { x: -2000, y: -900 },
  { x: 3200, y: -2200 },
  { x: -2800, y: 3400 },
  { x: 4500, y: 1800 },
  { x: -4200, y: -3100 },
  { x: 5800, y: -4800 },
  { x: -6500, y: 5200 },
  { x: 8200, y: 2400 },
  { x: -7800, y: -6200 },
  { x: 10500, y: -3500 },
  { x: -9800, y: 8800 },
  { x: 13200, y: 6100 },
  { x: -12500, y: -10200 },
  { x: 16800, y: -11800 },
  { x: -15200, y: 13500 },
  { x: 19500, y: 8200 },
  { x: -18800, y: -15600 },
]

const SEED_ENTRIES: SeedEntry[] = [
  { name: 'Maya', wish: 'my family stays healthy and happy' },
  { name: 'Lucas', wish: 'I could travel and see the ocean again' },
  { name: 'Sofia', wish: 'for more kindness in the world' },
  { name: 'Noah', wish: 'my little brother finds true friends' },
  { name: 'Aisha', wish: 'I could do skating' },
  { name: 'Emil', wish: 'for peaceful mornings and quiet evenings' },
  { name: 'Lena', wish: 'my grandmother feels the sunlight again' },
  { name: 'Omar', wish: 'courage for everyone starting over' },
  { name: 'Clara', wish: 'the lonely know they are not alone' },
  { name: 'Finn', wish: 'love outlasts every hard season' },
  { name: 'Yuki', wish: 'we remember to look up together' },
  { name: 'Priya', wish: 'healing for all who are still hurting' },
  { name: 'Marco', wish: 'my city becomes softer and safer' },
  { name: 'Hana', wish: 'I can learn piano one day' },
  { name: 'Leo', wish: 'for stars to guide lost hearts home' },
  { name: 'Ines', wish: 'my parents find rest after so many years' },
  { name: 'Raj', wish: 'every child has a warm place to sleep' },
  { name: 'Elena', wish: 'I could speak without fear' },
  { name: 'Theo', wish: 'for gardens to grow in forgotten places' },
  { name: 'Amira', wish: 'my friends never stop laughing' },
  { name: 'Jonas', wish: 'the world grows quieter and gentler' },
  { name: 'Mei', wish: 'I find work that feels meaningful' },
  { name: 'Diego', wish: 'for second chances to be real' },
  { name: 'Nina', wish: 'my sister passes her exams' },
  { name: 'Kai', wish: 'snow again at home this winter' },
  { name: 'Zara', wish: 'for patience when everything feels slow' },
  { name: 'Ivan', wish: 'I could hug my friend far away' },
  { name: 'Freya', wish: 'mornings that feel gentle again' },
  { name: 'Sam', wish: 'for art to keep people hopeful' },
  { name: 'Rosa', wish: 'my heart feels light after grief' },
  { name: 'Tariq', wish: 'safe journeys for everyone I love' },
  { name: 'Vera', wish: 'I can keep the promises I make' },
  { name: 'Hugo', wish: 'for old friendships to find their way back' },
  { name: 'Laila', wish: 'the night sky never feels empty' },
  { name: 'Oscar', wish: 'I could build something beautiful' },
  { name: 'Anya', wish: 'for hope in every small town' },
]

function distance(a: Position, b: Position): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function isValidPosition(candidate: Position, existing: Position[]): boolean {
  return existing.every((p) => distance(candidate, p) >= CONSTELLATION_MIN_DISTANCE)
}

function placeSeedConstellation(index: number, wish: string, globalPositions: Position[]): Position {
  const seed = hashWish(wish)
  const sector = PLACEMENT_SECTORS[index % PLACEMENT_SECTORS.length]
  const ring = Math.floor(index / PLACEMENT_SECTORS.length)
  const sectorCenter = {
    x: sector.x + ring * 200 * Math.cos(index * 1.73),
    y: sector.y + ring * 200 * Math.sin(index * 1.73),
  }

  const localExisting = globalPositions.map((p) => ({
    x: p.x - sectorCenter.x,
    y: p.y - sectorCenter.y,
  }))

  const relative = findEmptyPosition(
    localExisting,
    CONSTELLATION_MIN_DISTANCE,
    seed + index * 31_337,
  )
  const candidate = {
    x: sectorCenter.x + relative.x,
    y: sectorCenter.y + relative.y,
  }

  if (isValidPosition(candidate, globalPositions)) {
    return candidate
  }

  return findEmptyPosition(globalPositions, CONSTELLATION_MIN_DISTANCE, seed + index * 31_337)
}

function buildSeedPositions(): Position[] {
  const positions: Position[] = []

  for (let i = 0; i < SEED_ENTRIES.length; i++) {
    const pos = placeSeedConstellation(i, SEED_ENTRIES[i].wish, positions)
    positions.push(pos)
  }

  return positions
}

const SEED_POSITIONS = buildSeedPositions()

export function getSeedConstellationPositions(): Position[] {
  return SEED_POSITIONS
}
