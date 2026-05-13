import type { AssetType, RepSector, PlayerReputation } from '../../types/game'

export const REP_SECTORS: RepSector[] = ['financial', 'real_estate', 'sports', 'agro', 'energy', 'tourism']

export const SECTOR_LABELS: Record<RepSector, string> = {
  financial:   'Financiero',
  real_estate: 'Inmobiliario',
  sports:      'Deportivo',
  agro:        'Agropecuario',
  energy:      'Energético',
  tourism:     'Turístico',
}

export const SECTOR_ICONS: Record<RepSector, string> = {
  financial:   '📊',
  real_estate: '🏠',
  sports:      '⚽',
  agro:        '🌾',
  energy:      '⚡',
  tourism:     '✈️',
}

export const ASSET_SECTOR: Partial<Record<AssetType, RepSector>> = {
  company:     'financial',
  bond:        'financial',
  real_estate: 'real_estate',
  club:        'sports',
  agriculture: 'agro',
  energy:      'energy',
  tourism:     'tourism',
}

export const REP_TITLES: { min: number; label: string; color: string }[] = [
  { min: 0,  label: 'Novato',   color: 'text-gray-400' },
  { min: 10, label: 'Conocedor', color: 'text-blue-400' },
  { min: 25, label: 'Experto',  color: 'text-purple-400' },
  { min: 50, label: 'Magnate',  color: 'text-mango-400' },
  { min: 75, label: 'Leyenda',  color: 'text-yellow-400' },
]

export function getRepTitle(points: number) {
  return [...REP_TITLES].reverse().find((t) => points >= t.min) ?? REP_TITLES[0]
}

export function getSectorForAsset(assetType: AssetType): RepSector | null {
  return ASSET_SECTOR[assetType] ?? null
}

export function getRepGain(assetType: AssetType): number {
  // Points gained per purchase
  switch (assetType) {
    case 'bond':        return 3
    case 'company':     return 4
    case 'real_estate': return 5
    case 'club':        return 5
    case 'agriculture': return 4
    case 'energy':      return 5
    case 'tourism':     return 4
    default:            return 2
  }
}

export function emptyReputation(): PlayerReputation {
  return { financial: 0, real_estate: 0, sports: 0, agro: 0, energy: 0, tourism: 0 }
}

export function addReputation(
  current: PlayerReputation,
  sector: RepSector,
  points: number,
): PlayerReputation {
  return {
    ...current,
    [sector]: Math.min(100, (current[sector] ?? 0) + points),
  }
}

export function canBuyAsset(
  requiredRep: { sector: RepSector; points: number } | undefined,
  reputation: PlayerReputation,
): boolean {
  if (!requiredRep) return true
  return (reputation[requiredRep.sector] ?? 0) >= requiredRep.points
}
