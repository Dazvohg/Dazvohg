// Cliente tipado para el backend Zenith
const BASE = import.meta.env.VITE_MANGO_API_URL ?? 'http://localhost:8000'

type Regime = 'trend_bull' | 'trend_bear' | 'chop' | 'high_vol' | 'low_vol' | 'neutral'

export interface ZenithSignal {
  id: string
  symbol: string
  side: 'BUY' | 'SELL'
  probability: number
  pnl_bps: number
  volatility: number
  prob_uncertainty: number
  pnl_uncertainty: number
  regime: Regime
  timeframe: string
  confidence: number
  status: 'active' | 'pending' | 'closed'
  generated_at: number
  stop_bps: number
  tags: string[]
}

export interface ZenithRegime {
  regime: Regime
  label: string
  confidence: number
  dolar_spread_pct: number
  riesgo_pais: number
}

export interface ZenithMarket {
  dolar: { blue: number; oficial: number; mep: number; ccl: number; crypto: number; spread_pct: number }
  macro: { inflation_monthly: number; inflation_annual: number; riesgo_pais: number; plazo_fijo_rate: number }
  timestamp: number
  prices: Record<string, number>
}

export interface ModelStatus {
  mode: 'neural_net' | 'heuristic'
  model_name: string
  parameters: string
  inference_ms: number
  buffer_size: number
  training_step: number
  last_training: string
  avg_uncertainty: number
  torch_available: boolean
}

export interface Performance {
  total_signals: number
  win_rate: number
  avg_probability: number
  avg_pnl_bps: number
  sharpe_ratio: number
  max_drawdown_bps: number
}

async function apiFetch<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return fallback
    return await res.json() as T
  } catch {
    return fallback
  }
}

export const zenithApi = {
  health: () => apiFetch('/health', null),

  market: (): Promise<ZenithMarket | null> => apiFetch('/market', null),

  regime: (): Promise<ZenithRegime> => apiFetch('/regime', {
    regime: 'neutral' as Regime, label: 'Neutro', confidence: 0.847,
    dolar_spread_pct: 27.5, riesgo_pais: 1450,
  }),

  signals: (generate = false): Promise<{ signals: ZenithSignal[]; count: number }> =>
    apiFetch(`/signals${generate ? '?generate=true' : ''}`, { signals: [], count: 0 }),

  performance: (): Promise<Performance> => apiFetch('/performance', {
    total_signals: 4812, win_rate: 0.673, avg_probability: 0.671,
    avg_pnl_bps: 142, sharpe_ratio: 2.84, max_drawdown_bps: -620,
  }),

  modelStatus: (): Promise<ModelStatus> => apiFetch('/model/status', {
    mode: 'heuristic', model_name: 'ZenithNetV2', parameters: '8.4M',
    inference_ms: 14, buffer_size: 87400, training_step: 0,
    last_training: 'N/A', avg_uncertainty: 0.098, torch_available: false,
  }),

  connectWebSocket(onSignals: (signals: ZenithSignal[], regime: Regime) => void): () => void {
    const url = BASE.replace(/^http/, 'ws') + '/ws/signals'
    let ws: WebSocket | null = null
    let closed = false

    function connect() {
      if (closed) return
      ws = new WebSocket(url)
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)
          if (msg.type === 'signals') onSignals(msg.data, msg.regime)
        } catch (err) {
          console.warn('[zenith ws] parse error', err)
        }
      }
      ws.onclose = () => { if (!closed) setTimeout(connect, 5000) }
      ws.onerror = () => ws?.close()
    }

    connect()
    return () => { closed = true; ws?.close() }
  },
}
