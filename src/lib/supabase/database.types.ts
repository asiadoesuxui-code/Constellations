export interface Database {
  public: {
    Tables: {
      constellations: {
        Row: {
          id: string
          created_at: string
          name: string
          wish: string
          seed: number
          x: number
          y: number
          colour_palette: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          wish: string
          seed: number
          x: number
          y: number
          colour_palette?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          wish?: string
          seed?: number
          x?: number
          y?: number
          colour_palette?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type ConstellationRow = Database['public']['Tables']['constellations']['Row']
