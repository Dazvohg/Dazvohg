export interface Position {
  symbol: string
  name: string
  type: 'stock' | 'bond' | 'crypto' | 'cash'
  quantity: number
  avgCost: number
  currentPrice: number
  value: number
  pnl: number
  pnlPct: number
  allocation: number  // % of portfolio
  color: string
}

export interface PortfolioSummary {
  totalValue: number
  totalPnl: number
  totalPnlPct: number
  dailyPnl: number
  dailyPnlPct: number
  cash: number
  invested: number
}

export const POSITIONS: Position[] = [
  { symbol: 'YPF',    name: 'YPF ADR',         type: 'stock', quantity: 850,  avgCost: 15.42, currentPrice: 18.72, value: 15_912,  pnl:  2_805, pnlPct: 21.4,  allocation: 28.5, color: '#10b981' },
  { symbol: 'BMA',    name: 'Macro ADR',        type: 'stock', quantity: 120,  avgCost: 68.10, currentPrice: 72.45, value:  8_694,  pnl:    522, pnlPct:  6.4,  allocation: 15.6, color: '#6366f1' },
  { symbol: 'GGAL',   name: 'Galicia ADR',      type: 'stock', quantity: 200,  avgCost: 43.20, currentPrice: 41.18, value:  8_236,  pnl:   -404, pnlPct: -4.7,  allocation: 14.7, color: '#ef4444' },
  { symbol: 'TGS',    name: 'TGS ADR',          type: 'stock', quantity: 300,  avgCost: 19.80, currentPrice: 22.90, value:  6_870,  pnl:    930, pnlPct: 15.7,  allocation: 12.3, color: '#0ea5e9' },
  { symbol: 'AL30',   name: 'Bono AL30',        type: 'bond',  quantity: 50,   avgCost: 64.20, currentPrice: 67.85, value:  3_393,  pnl:    183, pnlPct:  5.7,  allocation:  6.1, color: '#f59e0b' },
  { symbol: 'GD35',   name: 'Bono GD35',        type: 'bond',  quantity: 30,   avgCost: 70.50, currentPrice: 72.10, value:  2_163,  pnl:     48, pnlPct:  2.3,  allocation:  3.9, color: '#8b5cf6' },
  { symbol: 'BTC',    name: 'Bitcoin',           type: 'crypto',quantity: 0.12, avgCost: 58_200, currentPrice: 68_420, value: 8_210, pnl: 1_226, pnlPct: 17.6,  allocation: 14.7, color: '#f97316' },
  { symbol: 'CASH',   name: 'Efectivo USD',      type: 'cash',  quantity: 2_350, avgCost: 1,   currentPrice: 1,    value:  2_350,  pnl:      0, pnlPct:  0,    allocation:  4.2, color: '#64748b' },
]

export const SUMMARY: PortfolioSummary = {
  totalValue:   55_828,
  totalPnl:      5_310,
  totalPnlPct:   10.52,
  dailyPnl:       +734,
  dailyPnlPct:    1.33,
  cash:           2_350,
  invested:      53_478,
}
