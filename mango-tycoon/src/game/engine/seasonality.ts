import type { SeasonalBonus, AssetType } from '../../types/game'

export const SEASONS: SeasonalBonus[] = [
  {
    season: 'verano',
    label: 'Verano Argentino',
    icon: '☀️',
    description: 'Temporada alta de turismo y consumo. Las costas, Bariloche y las cataratas atraen millones.',
    activeMonths: [11, 0, 1],  // Dec, Jan, Feb
    bonuses: [
      { assetType: 'tourism', multiplier: 1.4, label: '+40% turismo' },
      { assetType: 'real_estate', multiplier: 1.15, label: '+15% inmuebles costeros' },
      { assetType: 'company', multiplier: 1.1, label: '+10% empresas retail' },
    ],
  },
  {
    season: 'cosecha',
    label: 'Cosecha Grande',
    icon: '🌾',
    description: 'Marzo-mayo: la cosecha gruesa de soja y el Malbec del Valle de Uco muestran todo su potencial.',
    activeMonths: [2, 3, 4],  // Mar, Apr, May
    bonuses: [
      { assetType: 'agriculture', multiplier: 1.35, label: '+35% agro' },
      { assetType: 'real_estate', multiplier: 1.1, label: '+10% Mendoza/Pampa' },
      { assetType: 'bond', multiplier: 1.05, label: '+5% bonos (dólares cosecha)' },
    ],
  },
  {
    season: 'invierno',
    label: 'Copa Libertadores',
    icon: '⚽',
    description: 'Invierno es temporada de fútbol sudamericano y nieve. Los clubes y el turismo de montaña brillan.',
    activeMonths: [5, 6, 7],  // Jun, Jul, Aug
    bonuses: [
      { assetType: 'club', multiplier: 1.3, label: '+30% clubes' },
      { assetType: 'tourism', multiplier: 1.2, label: '+20% nieve Bariloche' },
      { assetType: 'energy', multiplier: 1.1, label: '+10% energía (demanda eléctrica)' },
    ],
  },
  {
    season: 'primavera',
    label: 'Reactivación Primaveral',
    icon: '🌸',
    description: 'El campo florece, los negocios se reactivan y las obras de construcción aceleran.',
    activeMonths: [8, 9, 10],  // Sep, Oct, Nov
    bonuses: [
      { assetType: 'real_estate', multiplier: 1.2, label: '+20% inmuebles' },
      { assetType: 'company', multiplier: 1.12, label: '+12% empresas' },
      { assetType: 'agriculture', multiplier: 1.08, label: '+8% agro (siembra)' },
    ],
  },
  {
    season: 'fiestas',
    label: 'Fiestas y Fin de Año',
    icon: '🎉',
    description: 'Diciembre: el rally fin de año, consumo en máximos y el peso de los aguinaldos inyectan liquidez al mercado.',
    activeMonths: [11],  // Dec (overrides verano for Dec)
    bonuses: [
      { assetType: 'company', multiplier: 1.25, label: '+25% empresas' },
      { assetType: 'tourism', multiplier: 1.3, label: '+30% turismo' },
      { assetType: 'bond', multiplier: 0.95, label: '−5% bonos (toma ganancias)' },
    ],
  },
]

export function getCurrentSeason(): SeasonalBonus {
  const month = new Date().getMonth()  // 0-11
  // December triggers fiestas before verano
  if (month === 11) return SEASONS[4]
  const found = SEASONS.find((s) => s.activeMonths.includes(month))
  return found ?? SEASONS[0]
}

export function getSeasonalMultiplier(assetType: AssetType, season: SeasonalBonus): number {
  const bonus = season.bonuses.find((b) => b.assetType === assetType)
  return bonus?.multiplier ?? 1.0
}

export function getSeasonalYield(baseYield: number, assetType: AssetType, season: SeasonalBonus): number {
  const m = getSeasonalMultiplier(assetType, season)
  return Math.round(baseYield * m * 100) / 100
}
