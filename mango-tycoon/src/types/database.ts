export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          level: number
          mango_cash: number
          last_login: string
          total_invested: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      market_assets: {
        Row: {
          id: string
          type: string
          name: string
          description: string
          price: number
          yield_rate: number
          location: string
          risk_level: string
          educational_note: string
          icon: string
        }
        Insert: Omit<Database['public']['Tables']['market_assets']['Row'], never>
        Update: Partial<Database['public']['Tables']['market_assets']['Row']>
      }
      player_assets: {
        Row: {
          id: string
          player_id: string
          asset_id: string
          bought_at: number
          quantity: number
          purchased_at: string
        }
        Insert: Omit<Database['public']['Tables']['player_assets']['Row'], 'id' | 'purchased_at'>
        Update: Partial<Database['public']['Tables']['player_assets']['Insert']>
      }
      objectives: {
        Row: {
          id: string
          title: string
          description: string
          reward: number
          condition: Record<string, unknown>
          category: string
          icon: string
        }
        Insert: Database['public']['Tables']['objectives']['Row']
        Update: Partial<Database['public']['Tables']['objectives']['Row']>
      }
      player_objectives: {
        Row: {
          player_id: string
          objective_id: string
          completed_at: string | null
        }
        Insert: Database['public']['Tables']['player_objectives']['Row']
        Update: Partial<Database['public']['Tables']['player_objectives']['Row']>
      }
      economy_events: {
        Row: {
          id: string
          type: string
          title: string
          description: string
          impact: Record<string, unknown>
          active_from: string
          active_to: string
        }
        Insert: Omit<Database['public']['Tables']['economy_events']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['economy_events']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
