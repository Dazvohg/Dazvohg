export type SignalDirection = 'LONG' | 'SHORT' | 'NEUTRAL'
export type SignalStatus = 'active' | 'closed_win' | 'closed_loss' | 'pending'

export interface ZenithSignal {
  id: string
  symbol: string
  name: string
  direction: SignalDirection
  status: SignalStatus
  probability: number    // 0-1
  uncertainty: number    // 0-1  (from aleatoric uncertainty head)
  entryPrice: number
  targetPrice: number
  stopLoss: number
  currentPrice: number
  pnlBps: number         // basis points
  regime: string
  timeframe: '5s' | '15s' | '60s'
  createdAt: string
  closedAt?: string
  modelVersion: string
  attentionPeaks: string[]  // top features contributing to signal
}

export const SIGNALS: ZenithSignal[] = [
  {
    id: 'sig_001',
    symbol: 'YPF',
    name: 'YPF ADR',
    direction: 'LONG',
    status: 'active',
    probability: 0.847,
    uncertainty: 0.062,
    entryPrice: 18.29,
    targetPrice: 19.10,
    stopLoss: 17.85,
    currentPrice: 18.72,
    pnlBps: 235,
    regime: 'Tendencia Alcista',
    timeframe: '60s',
    createdAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
    modelVersion: 'zenith-v2.0',
    attentionPeaks: ['Order flow imbalance', 'RSI divergence', 'Volume spike t-3'],
  },
  {
    id: 'sig_002',
    symbol: 'GGAL',
    name: 'Galicia ADR',
    direction: 'SHORT',
    status: 'active',
    probability: 0.731,
    uncertainty: 0.118,
    entryPrice: 41.95,
    targetPrice: 40.20,
    stopLoss: 42.80,
    currentPrice: 41.18,
    pnlBps: 184,
    regime: 'Alta Volatilidad',
    timeframe: '15s',
    createdAt: new Date(Date.now() - 45 * 60_000).toISOString(),
    modelVersion: 'zenith-v2.0',
    attentionPeaks: ['Bid-ask spread widening', 'Cross-asset correlation YPF', 'Microstructure toxicity'],
  },
  {
    id: 'sig_003',
    symbol: 'BMA',
    name: 'Macro ADR',
    direction: 'LONG',
    status: 'active',
    probability: 0.792,
    uncertainty: 0.089,
    entryPrice: 71.22,
    targetPrice: 73.80,
    stopLoss: 70.10,
    currentPrice: 72.45,
    pnlBps: 173,
    regime: 'Tendencia Alcista',
    timeframe: '60s',
    createdAt: new Date(Date.now() - 1.5 * 3600_000).toISOString(),
    modelVersion: 'zenith-v2.0',
    attentionPeaks: ['MERVAL momentum transfer', 'Vols term structure', 'Institutional flow'],
  },
  {
    id: 'sig_004',
    symbol: 'TGS',
    name: 'TGS ADR',
    direction: 'LONG',
    status: 'pending',
    probability: 0.682,
    uncertainty: 0.143,
    entryPrice: 22.50,
    targetPrice: 23.90,
    stopLoss: 21.80,
    currentPrice: 22.90,
    pnlBps: 0,
    regime: 'Lateral / Chop',
    timeframe: '15s',
    createdAt: new Date(Date.now() - 8 * 60_000).toISOString(),
    modelVersion: 'zenith-v2.0',
    attentionPeaks: ['Energy sector rotation', 'Open interest build', 'VWAP reclaim'],
  },
  {
    id: 'sig_005',
    symbol: 'AL30',
    name: 'Bono AL30',
    direction: 'LONG',
    status: 'closed_win',
    probability: 0.815,
    uncertainty: 0.071,
    entryPrice: 66.90,
    targetPrice: 68.20,
    stopLoss: 66.20,
    currentPrice: 68.10,
    pnlBps: 179,
    regime: 'Baja Volatilidad',
    timeframe: '60s',
    createdAt: new Date(Date.now() - 6 * 3600_000).toISOString(),
    closedAt: new Date(Date.now() - 3 * 3600_000).toISOString(),
    modelVersion: 'zenith-v2.0',
    attentionPeaks: ['Duration compression', 'CDS tightening', 'Risk-on global'],
  },
  {
    id: 'sig_006',
    symbol: 'TEO',
    name: 'Telecom ADR',
    direction: 'SHORT',
    status: 'closed_loss',
    probability: 0.641,
    uncertainty: 0.192,
    entryPrice: 14.20,
    targetPrice: 13.50,
    stopLoss: 14.65,
    currentPrice: 14.60,
    pnlBps: -281,
    regime: 'Alta Volatilidad',
    timeframe: '5s',
    createdAt: new Date(Date.now() - 10 * 3600_000).toISOString(),
    closedAt: new Date(Date.now() - 8 * 3600_000).toISOString(),
    modelVersion: 'zenith-v2.0',
    attentionPeaks: ['News surprise event', 'Gamma squeeze risk'],
  },
]

export interface PerformanceMetrics {
  totalSignals: number
  winRate: number
  avgPnlBps: number
  sharpeRatio: number
  maxDrawdownBps: number
  avgProbability: number
  avgUncertainty: number
  calendarYear: string
}

export const PERFORMANCE: PerformanceMetrics = {
  totalSignals: 4_812,
  winRate: 0.673,
  avgPnlBps: 142,
  sharpeRatio: 2.84,
  maxDrawdownBps: -620,
  avgProbability: 0.741,
  avgUncertainty: 0.098,
  calendarYear: '2025',
}

export interface DailyPnL {
  date: string
  pnlBps: number
  cumPnlBps: number
  signals: number
}

export function generateDailyPnL(days = 90): DailyPnL[] {
  const result: DailyPnL[] = []
  let cum = 0
  const now = new Date()
  let rng = 42

  function nextRng() {
    rng = (rng * 1664525 + 1013904223) & 0xffffffff
    return (rng >>> 0) / 0xffffffff
  }

  for (let i = days; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    if (d.getDay() === 0 || d.getDay() === 6) continue
    const pnl = Math.round((nextRng() - 0.38) * 500)
    cum += pnl
    result.push({
      date: d.toISOString().slice(0, 10),
      pnlBps: pnl,
      cumPnlBps: cum,
      signals: Math.floor(nextRng() * 30) + 20,
    })
  }
  return result
}
