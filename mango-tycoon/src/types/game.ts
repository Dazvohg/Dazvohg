export type AssetType = 'company' | 'real_estate' | 'bond' | 'club' | 'agriculture' | 'tourism' | 'energy'
export type RiskLevel = 'low' | 'medium' | 'high'
export type ObjectiveCategory = 'investment' | 'trading' | 'level' | 'portfolio' | 'reputation' | 'regional'
export type EconomyEventType = 'inflation' | 'dolar_blue' | 'crisis' | 'boom' | 'cepo' | 'rate_change' | 'harvest' | 'sports' | 'election' | 'tourism'
export type RepSector = 'financial' | 'real_estate' | 'sports' | 'agro' | 'energy' | 'tourism'
export type SeasonName = 'verano' | 'cosecha' | 'invierno' | 'primavera' | 'fiestas'

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
  requiredRep?: { sector: RepSector; points: number }
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
  type: 'buy_asset' | 'reach_cash' | 'own_assets' | 'reach_level' | 'portfolio_value' | 'reach_rep'
  assetType?: AssetType
  quantity?: number
  amount?: number
  level?: number
  sector?: RepSector
  repPoints?: number
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
  agricultureMultiplier?: number
  tourismMultiplier?: number
  energyMultiplier?: number
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

export interface SeasonalBonus {
  season: SeasonName
  label: string
  icon: string
  description: string
  bonuses: { assetType: AssetType; multiplier: number; label: string }[]
  activeMonths: number[]  // 0-11
}

export interface PlayerReputation {
  financial: number
  real_estate: number
  sports: number
  agro: number
  energy: number
  tourism: number
}

export interface OwnedCompany {
  id: string
  name: string
  type: string
  sector: RepSector
  capitalInvested: number
  yieldRate: number
  foundedAt: string
  lastEventDesc: string | null
  lastEventDelta: number
  lastEventAt: string | null
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
