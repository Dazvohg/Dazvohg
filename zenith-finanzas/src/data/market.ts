export interface Instrument {
  symbol: string
  name: string
  price: number
  change: number   // absolute
  changePct: number
  volume: number
  type: 'merval' | 'adr' | 'bond' | 'crypto' | 'commodity'
}

export interface Candle {
  time: number // unix ms
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface MarketRegime {
  id: number
  label: string
  description: string
  color: string
  confidence: number
}

// Argentine + global instruments tracked by Zenith
export const INSTRUMENTS: Instrument[] = [
  { symbol: 'MERVAL',  name: 'Merval',          price: 1_852_340, change: 28_610,  changePct:  1.57, volume: 2_841_000_000, type: 'merval' },
  { symbol: 'YPF',     name: 'YPF ADR',         price: 18.72,     change:  0.43,   changePct:  2.35, volume: 12_400_000,   type: 'adr'    },
  { symbol: 'GGAL',    name: 'Galicia ADR',      price: 41.18,     change: -0.82,   changePct: -1.95, volume:  8_200_000,   type: 'adr'    },
  { symbol: 'BMA',     name: 'Macro ADR',        price: 72.45,     change:  1.23,   changePct:  1.73, volume:  3_900_000,   type: 'adr'    },
  { symbol: 'TEO',     name: 'Telecom ADR',      price: 14.60,     change: -0.15,   changePct: -1.02, volume:  2_100_000,   type: 'adr'    },
  { symbol: 'TGS',     name: 'TGS ADR',          price: 22.90,     change:  0.67,   changePct:  3.01, volume:  1_800_000,   type: 'adr'    },
  { symbol: 'AL30',    name: 'Bono AL30',         price:  67.85,    change:  0.35,   changePct:  0.52, volume:    420_000,   type: 'bond'   },
  { symbol: 'GD35',    name: 'Bono GD35',         price:  72.10,    change: -0.20,   changePct: -0.28, volume:    290_000,   type: 'bond'   },
  { symbol: 'BTC',     name: 'Bitcoin',           price: 68_420,    change: 1_210,   changePct:  1.80, volume: 42_100_000_000, type: 'crypto' },
  { symbol: 'SOY',     name: 'Soja (CBOT)',       price: 447.50,    change: -2.75,   changePct: -0.61, volume:    180_000,   type: 'commodity' },
  { symbol: 'WTI',     name: 'WTI Crudo',         price: 79.32,     change:  0.48,   changePct:  0.61, volume: 1_200_000_000, type: 'commodity' },
]

export const REGIMES: MarketRegime[] = [
  { id: 0, label: 'Tendencia Alcista', description: 'Momentum positivo sostenido con alta participación de volumen', color: '#10b981', confidence: 0 },
  { id: 1, label: 'Tendencia Bajista', description: 'Presión vendedora dominante, señales de distribución en ADRs', color: '#ef4444', confidence: 0 },
  { id: 2, label: 'Lateral / Chop',    description: 'Mercado sin dirección definida, alta incertidumbre', color: '#f59e0b', confidence: 0 },
  { id: 3, label: 'Alta Volatilidad',  description: 'Movimientos amplios intraday, spread bid-ask elevado', color: '#8b5cf6', confidence: 0 },
  { id: 4, label: 'Baja Volatilidad',  description: 'Compresión de rango, posible breakout inminente', color: '#0ea5e9', confidence: 0 },
  { id: 5, label: 'Neutro',           description: 'Transición entre regímenes, señales mixtas', color: '#64748b', confidence: 0 },
]

function seed(n: number) {
  let s = n
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff }
}

export function generateCandles(basePrice: number, count = 120, intervalMs = 5 * 60_000): Candle[] {
  const rng = seed(basePrice * 137)
  const candles: Candle[] = []
  let price = basePrice
  const now = Date.now()

  for (let i = count; i >= 0; i--) {
    const open = price
    const move = (rng() - 0.48) * price * 0.008
    const close = open + move
    const high = Math.max(open, close) * (1 + rng() * 0.005)
    const low  = Math.min(open, close) * (1 - rng() * 0.005)
    const volume = Math.round(basePrice * 1000 * (0.5 + rng()))
    candles.push({ time: now - i * intervalMs, open, high, low, close, volume })
    price = close
  }
  return candles
}

export function tickerInstruments(): (Instrument & { display: string })[] {
  return INSTRUMENTS.map(i => ({
    ...i,
    display: `${i.symbol}  ${formatPrice(i.symbol, i.price)}  ${i.changePct >= 0 ? '+' : ''}${i.changePct.toFixed(2)}%`,
  }))
}

function formatPrice(symbol: string, price: number) {
  if (symbol === 'MERVAL') return price.toLocaleString('es-AR')
  if (symbol === 'BTC') return `$${price.toLocaleString()}`
  return `$${price.toFixed(2)}`
}
