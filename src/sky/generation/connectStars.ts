import { SeededRandom } from './seededRandom'

export interface StarPoint {
  x: number
  y: number
  bright: boolean
}

function distance(a: StarPoint, b: StarPoint): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

export function connectStars(stars: StarPoint[], rng: SeededRandom): [number, number][] {
  if (stars.length < 2) return []

  const edges: [number, number][] = []
  const visited = new Set<number>([0])
  const unvisited = new Set(stars.map((_, i) => i).filter((i) => i !== 0))

  while (unvisited.size > 0) {
    let bestFrom = -1
    let bestTo = -1
    let bestDist = Infinity

    for (const from of visited) {
      for (const to of unvisited) {
        const d = distance(stars[from], stars[to])
        if (d < bestDist) {
          bestDist = d
          bestFrom = from
          bestTo = to
        }
      }
    }

    if (bestFrom >= 0 && bestTo >= 0) {
      edges.push([bestFrom, bestTo])
      visited.add(bestTo)
      unvisited.delete(bestTo)
    }
  }

  const extraCount = rng.nextInt(1, 2)
  for (let e = 0; e < extraCount; e++) {
    const a = rng.nextInt(0, stars.length - 1)
    let b = rng.nextInt(0, stars.length - 1)
    while (b === a) b = rng.nextInt(0, stars.length - 1)
    const edge: [number, number] = a < b ? [a, b] : [b, a]
    const exists = edges.some(([x, y]) => x === edge[0] && y === edge[1])
    if (!exists) edges.push(edge)
  }

  return edges
}
