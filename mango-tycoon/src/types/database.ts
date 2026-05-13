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
          required_rep_sector: string | null
          required_rep_points: number | null
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
      economy_state: {
        Row: {
          id: number
          dolar_blue: number
          dolar_oficial: number
          dolar_blue_prev: number
          inflation_monthly: number
          inflation_annual: number
          updated_at: string
        }
        Insert: Database['public']['Tables']['economy_state']['Row']
        Update: Partial<Database['public']['Tables']['economy_state']['Row']>
      }
      asset_price_history: {
        Row: {
          id: string
          asset_id: string
          price: number
          recorded_at: string
        }
        Insert: Omit<Database['public']['Tables']['asset_price_history']['Row'], 'id' | 'recorded_at'>
        Update: never
      }
      football_results: {
        Row: {
          id: string
          match_id: number
          home_team: string
          away_team: string
          home_score: number
          away_score: number
          processed_at: string
        }
        Insert: Omit<Database['public']['Tables']['football_results']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['football_results']['Insert']>
      }
      player_reputation: {
        Row: {
          player_id: string
          sector: string
          points: number
          updated_at: string
        }
        Insert: Database['public']['Tables']['player_reputation']['Row']
        Update: Partial<Database['public']['Tables']['player_reputation']['Row']>
      }
      own_companies: {
        Row: {
          id: string
          player_id: string
          name: string
          type: string
          sector: string
          capital_invested: number
          yield_rate: number
          founded_at: string
          last_event_at: string | null
          last_event_desc: string | null
          last_event_delta: number
        }
        Insert: Omit<Database['public']['Tables']['own_companies']['Row'], 'id' | 'founded_at'>
        Update: Partial<Database['public']['Tables']['own_companies']['Insert']>
      }
      seasonal_state: {
        Row: {
          id: number
          season: string
          label: string
          icon: string
          description: string
          active_bonuses: unknown
          updated_at: string
        }
        Insert: Database['public']['Tables']['seasonal_state']['Row']
        Update: Partial<Database['public']['Tables']['seasonal_state']['Row']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
