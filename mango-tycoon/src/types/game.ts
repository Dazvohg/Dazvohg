export type AssetType = 'company' | 'real_estate' | 'bond' | 'club'
export type RiskLevel = 'low' | 'medium' | 'high'
export type ObjectiveCategory = 'investment' | 'trading' | 'level' | 'portfolio'
export type EconomyEventType = 'inflation' | 'dolar_blue' | 'crisis' | 'boom' | 'cepo' | 'rate_change'

export interface MarketAsset {
  id: string
  type: AssetType
  name: string
  description: string
  price: number
  yieldRate: number   // % daily
  location: string
  riskLevel: RiskLevel
  educationalNote: string
  icon: string
}

export interface OwnedAsset {
  id: string
  assetId: string
  asset: MarketAsset
  quantity: number
  boughtAt: number
  purchasedAt: string
}

export interface ObjectiveCondition {
  type: 'buy_asset' | 'reach_cash' | 'own_assets' | 'reach_level' | 'portfolio_value'
  assetType?: AssetType
  quantity?: number
  amount?: number
  level?: number
}

export interface Objective {
  id: string
  title: string
  description: string
  reward: number
  condition: ObjectiveCondition
  category: ObjectiveCategory
  icon: string
}

export interface PlayerObjective {
  objectiveId: string
  completedAt: string | null
  readyToClaim: boolean
  objective: Objective
}

export interface EconomyImpact {
  dolarBlueDelta?: number
  bondYieldDelta?: number
  realEstateMultiplier?: number
  companyMultiplier?: number
  clubMultiplier?: number
}

export interface EconomyEvent {
  id: string
  type: EconomyEventType
  title: string
  description: string
  impact: EconomyImpact
  activeFrom: string
  activeTo: string
}

export interface GameProfile {
  id: string
  username: string
  level: number
  mangoCash: number
  lastLogin: string
  totalInvested: number
  createdAt: string
}

export interface IncomeNotification {
  total: number
  breakdown: { assetName: string; income: number }[]
}
