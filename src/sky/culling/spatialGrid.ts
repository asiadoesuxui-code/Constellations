import type { ConstellationRecord } from '../../types/contracts'

const CELL_SIZE = 512

export class SpatialGrid {
  private cells = new Map<string, Set<string>>()
  private records = new Map<string, ConstellationRecord>()

  private key(cx: number, cy: number): string {
    return `${cx},${cy}`
  }

  private cellCoord(v: number): number {
    return Math.floor(v / CELL_SIZE)
  }

  add(record: ConstellationRecord): void {
    if (this.records.has(record.id)) return
    this.records.set(record.id, record)
    const cx = this.cellCoord(record.x)
    const cy = this.cellCoord(record.y)
    const k = this.key(cx, cy)
    if (!this.cells.has(k)) this.cells.set(k, new Set())
    this.cells.get(k)!.add(record.id)
  }

  remove(id: string): void {
    const record = this.records.get(id)
    if (!record) return
    const cx = this.cellCoord(record.x)
    const cy = this.cellCoord(record.y)
    this.cells.get(this.key(cx, cy))?.delete(id)
    this.records.delete(id)
  }

  query(minX: number, maxX: number, minY: number, maxY: number): ConstellationRecord[] {
    const minCX = this.cellCoord(minX)
    const maxCX = this.cellCoord(maxX)
    const minCY = this.cellCoord(minY)
    const maxCY = this.cellCoord(maxY)
    const result: ConstellationRecord[] = []
    const seen = new Set<string>()

    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        const ids = this.cells.get(this.key(cx, cy))
        if (!ids) continue
        for (const id of ids) {
          if (seen.has(id)) continue
          seen.add(id)
          const record = this.records.get(id)!
          if (
            record.x >= minX &&
            record.x <= maxX &&
            record.y >= minY &&
            record.y <= maxY
          ) {
            result.push(record)
          }
        }
      }
    }
    return result
  }

  getAll(): ConstellationRecord[] {
    return [...this.records.values()]
  }

  has(id: string): boolean {
    return this.records.has(id)
  }

  get size(): number {
    return this.records.size
  }
}
