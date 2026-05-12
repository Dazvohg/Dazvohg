import type { EconomyEvent, EconomyImpact, AssetType } from '../../types/game'

export interface EconomyState {
  dolarBlue: number
  inflationRate: number   // monthly %
}

export const BASE_ECONOMY: EconomyState = {
  dolarBlue: 1200,
  inflationRate: 8.5,
}

const EVENT_TEMPLATES: Omit<EconomyEvent, 'id' | 'activeFrom' | 'activeTo'>[] = [
  {
    type: 'dolar_blue',
    title: '⚡ Dólar Blue en Alza',
    description: 'La brecha cambiaria se amplía. El blue sube un 15% en el día.',
    impact: { dolarBlueDelta: 15, bondYieldDelta: 0.5 },
  },
  {
    type: 'crisis',
    title: '📉 Turbulencia Financiera',
    description: 'El riesgo país supera los 1.500 puntos. Los mercados caen.',
    impact: { bondYieldDelta: -1.5, companyMultiplier: 0.85 },
  },
  {
    type: 'boom',
    title: '🛢️ Boom de Vaca Muerta',
    description: 'Nuevos descubrimientos en Neuquén impulsan el sector energético.',
    impact: { companyMultiplier: 1.2, realEstateMultiplier: 1.05 },
  },
  {
    type: 'cepo',
    title: '🔒 Endurecimiento del Cepo',
    description: 'El BCRA refuerza los controles cambiarios.',
    impact: { dolarBlueDelta: 20, bondYieldDelta: -0.3 },
  },
  {
    type: 'rate_change',
    title: '🏦 BCRA Sube la Tasa',
    description: 'La tasa de política monetaria sube 500 puntos básicos.',
    impact: { bondYieldDelta: 1.0, companyMultiplier: 0.95 },
  },
  {
    type: 'inflation',
    title: '💸 Inflación Récord',
    description: 'El IPC mensual supera el 12%. Los activos reales se revalorizan.',
    impact: { realEstateMultiplier: 1.1, bondYieldDelta: 0.8 },
  },
  {
    type: 'boom',
    title: '🤝 Acuerdo con el FMI',
    description: 'El gobierno llega a un nuevo programa con el Fondo Monetario.',
    impact: { bondYieldDelta: 2.0, companyMultiplier: 1.15, dolarBlueDelta: -10 },
  },
  {
    type: 'boom',
    title: '🏆 Argentina Campeón',
    description: 'La Selección gana otro título internacional. Euforia nacional.',
    impact: { clubMultiplier: 1.3, companyMultiplier: 1.05 },
  },
  {
    type: 'crisis',
    title: '🌧️ Sequía en la Pampa Húmeda',
    description: 'La peor sequía en 60 años reduce la cosecha. Caen las reservas.',
    impact: { companyMultiplier: 0.9, bondYieldDelta: -1.0 },
  },
  {
    type: 'boom',
    title: '🚀 Boom del Litio',
    description: 'Argentina firma contratos mineros históricos por litio en el NOA.',
    impact: { companyMultiplier: 1.1, realEstateMultiplier: 1.08 },
  },
]

export function getRandomEvent(): EconomyEvent {
  const template = EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)]
  const now = new Date()
  const activeTo = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  return {
    ...template,
    id: crypto.randomUUID(),
    activeFrom: now.toISOString(),
    activeTo: activeTo.toISOString(),
  }
}

export function applyEventToAssetType(
  basePrice: number,
  assetType: AssetType,
  impact: EconomyImpact,
): number {
  let multiplier = 1
  switch (assetType) {
    case 'bond':
      if (impact.bondYieldDelta) multiplier += impact.bondYieldDelta * 0.02
      break
    case 'real_estate':
      multiplier = impact.realEstateMultiplier ?? 1
      break
    case 'company':
      multiplier = impact.companyMultiplier ?? 1
      break
    case 'club':
      multiplier = impact.clubMultiplier ?? 1
      break
  }
  return Math.round(basePrice * multiplier)
}

export function calculateLevel(totalInvested: number): number {
  return Math.min(50, Math.floor(Math.sqrt(totalInvested / 1000)) + 1)
}

export function xpToNextLevel(level: number): number {
  return level * level * 1000
}
