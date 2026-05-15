import { useState, useEffect, useMemo } from 'react'
import { Zap, Filter, Brain, TrendingUp, Radio, Lock, Crown } from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, ReferenceLine,
} from 'recharts'
import Header from '@/components/Header'
import SignalCard from '@/components/SignalCard'
import { SIGNALS, PERFORMANCE, generateDailyPnL } from '@/data/signals'
import type { ZenithSignal } from '@/data/signals'
import { zenithApi } from '@/lib/zenithApi'
import type { ZenithSignal as ApiSignal } from '@/lib/zenithApi'

type FilterStatus = 'all' | ZenithSignal['status']
type FilterDir = 'all' | 'LONG' | 'SHORT'

// ── Accuracy history simulada para el Oracle (determinista por semana) ───────
const ORACLE_HISTORY = [true, true, true, false, true, true, false] // 5/7 wins

const ORACLE_SIGNAL = {
  direction: 'LONG' as const,
  symbol: 'BTC/USD',
  entry: 68_400,
  target: 72_100,
  stop: 66_200,
  prob: 0.73,
  regime: 'Tendencia Alcista',
  regimeConf: 0.87,
  backtestReturn: 14.3,
  backtestUsd: 1_430,
}

function OraclePanel({ connected }: { connected: boolean }) {
  const sig = ORACLE_SIGNAL
  const R = 52, C = 2 * Math.PI * R
  const arc = C * sig.regimeConf
  const wins = ORACLE_HISTORY.filter(Boolean).length
  const rr = ((sig.target - sig.entry) / (sig.entry - sig.stop)).toFixed(1)
  const upPct = (((sig.target - sig.entry) / sig.entry) * 100).toFixed(1)
  const downPct = (((sig.entry - sig.stop) / sig.entry) * 100).toFixed(1)

  return (
    <div className="relative rounded-2xl overflow-hidden border border-[#1D9BF0]/25 bg-gradient-to-br from-[#0A1929] to-[#000000]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#1D9BF0]/15">
        <div>
          <div className="flex items-center gap-2">
            <Crown size={14} className="text-[#F59E0B]" />
            <span className="text-[#F59E0B] text-[10px] font-black tracking-widest uppercase">Oracle IA · Pro</span>
          </div>
          <h2 className="text-white text-xl font-black mt-0.5">Señal del Día</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-[#00BA7C] pulse-dot' : 'bg-[#71767B]'}`} />
          <span className="text-[10px] text-[#71767B]">{connected ? 'EN VIVO' : 'Demo'}</span>
        </div>
      </div>

      {/* Body */}
      <div className="flex gap-5 px-5 py-5">
        {/* SVG Gauge */}
        <div className="flex flex-col items-center shrink-0">
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r={R} fill="none" stroke="#2F3336" strokeWidth="10" />
            <circle
              cx="60" cy="60" r={R} fill="none"
              stroke="#1D9BF0" strokeWidth="10"
              strokeDasharray={`${arc.toFixed(1)} ${(C - arc).toFixed(1)}`}
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
            />
            <text x="60" y="54" textAnchor="middle" fill="white" fontSize="22" fontWeight="900" fontFamily="inherit">
              {Math.round(sig.regimeConf * 100)}%
            </text>
            <text x="60" y="68" textAnchor="middle" fill="#71767B" fontSize="9" fontFamily="inherit">confianza</text>
          </svg>
          <span className="text-[11px] text-[#1D9BF0] font-semibold mt-1 text-center leading-tight">{sig.regime}</span>
        </div>

        {/* Signal details */}
        <div className="flex-1 min-w-0">
          <div className={`text-2xl font-black mb-3 ${sig.direction === 'LONG' ? 'text-[#00BA7C]' : 'text-[#F4212E]'}`}>
            {sig.direction === 'LONG' ? '↑' : '↓'} {sig.direction} · {sig.symbol}
          </div>
          <div className="space-y-1.5 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-[#71767B]">Entrada</span>
              <span className="text-[#E7E9EA] font-semibold">${sig.entry.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#71767B]">Objetivo</span>
              <span className="text-[#00BA7C] font-semibold">${sig.target.toLocaleString()} (+{upPct}%)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#71767B]">Stop Loss</span>
              <span className="text-[#F4212E] font-semibold">${sig.stop.toLocaleString()} (-{downPct}%)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#71767B]">R/R</span>
              <span className="text-[#E7E9EA] font-semibold">1 : {rr}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#71767B]">Probabilidad</span>
              <span className="text-[#1D9BF0] font-semibold">{Math.round(sig.prob * 100)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Accuracy strip */}
      <div className="px-5 pb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] text-[#71767B]">Últimas 7 señales Oracle</span>
          <span className="text-[11px] font-bold text-[#00BA7C]">{wins}/7 ganadoras · {Math.round(wins/7*100)}%</span>
        </div>
        <div className="flex gap-1.5">
          {ORACLE_HISTORY.map((win, i) => (
            <div
              key={i}
              className={`flex-1 h-2 rounded-full ${win ? 'bg-[#00BA7C]' : 'bg-[#F4212E]'}`}
            />
          ))}
        </div>
      </div>

      {/* Backtest bar */}
      <div className="mx-5 mb-5 bg-[#001A10] border border-[#00BA7C]/20 rounded-xl px-4 py-3">
        <div className="text-[11px] text-[#71767B] mb-0.5">Si hubieras seguido las señales la semana pasada:</div>
        <div className="text-[#00BA7C] text-xl font-black">
          +{sig.backtestReturn}% · +${sig.backtestUsd.toLocaleString()} sobre $10,000
        </div>
      </div>

      {/* Pro lock overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3 rounded-2xl">
        <div className="w-14 h-14 rounded-2xl bg-[#F59E0B]/15 border border-[#F59E0B]/30 flex items-center justify-center">
          <Lock size={24} className="text-[#F59E0B]" />
        </div>
        <div className="text-center">
          <div className="text-white font-black text-lg">Oracle Pro</div>
          <div className="text-[#71767B] text-xs mt-1">Señales en tiempo real con IA</div>
        </div>
        <button className="bg-[#F59E0B] text-black font-black text-sm px-6 py-2.5 rounded-xl hover:bg-[#FBBF24] transition-colors">
          Activar Mango Pro
        </button>
        <span className="text-[#71767B] text-[10px]">US$ 9.99 / mes · cancelá cuando quieras</span>
      </div>
    </div>
  )
}

const dailyPnL = generateDailyPnL(60)

const STATUS_MAP: Record<ApiSignal['status'], ZenithSignal['status']> = {
  active:  'active',
  pending: 'pending',
  closed:  'closed_win',
}

const STATUS_LABEL: Record<FilterStatus, string> = {
  all:         'Todas',
  active:      'Activas',
  pending:     'Pendientes',
  closed_win:  'Ganadas',
  closed_loss: 'Perdidas',
}

function mapApiSignal(s: ApiSignal): ZenithSignal {
  const direction    = s.side === 'BUY' ? 'LONG' : 'SHORT'
  const syntheticEntry = 100
  const stopOffset   = (s.stop_bps / 10_000) * syntheticEntry
  const targetOffset = stopOffset * 1.5

  return {
    id: s.id,
    symbol: s.symbol,
    name: s.symbol,
    direction,
    status: STATUS_MAP[s.status] ?? 'closed_win',
    probability: s.probability,
    uncertainty: s.prob_uncertainty,
    entryPrice: syntheticEntry,
    targetPrice: direction === 'LONG' ? syntheticEntry + targetOffset : syntheticEntry - targetOffset,
    stopLoss:    direction === 'LONG' ? syntheticEntry - stopOffset   : syntheticEntry + stopOffset,
    currentPrice: syntheticEntry,
    pnlBps: s.pnl_bps,
    regime: s.regime,
    timeframe: s.timeframe as ZenithSignal['timeframe'],
    createdAt: new Date(s.generated_at * 1000).toISOString(),
    modelVersion: 'mango-v2.0',
    attentionPeaks: s.tags,
  }
}

export default function Signals() {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [filterDir, setFilterDir]       = useState<FilterDir>('all')
  const [liveSignals, setLiveSignals]   = useState<ZenithSignal[]>([])
  const [connected, setConnected]       = useState(false)

  useEffect(() => {
    zenithApi.signals().then(({ signals }) => {
      if (signals.length > 0) setLiveSignals(signals.map(mapApiSignal))
    })

    const disconnect = zenithApi.connectWebSocket((apiSignals) => {
      setConnected(true)
      if (apiSignals.length > 0) setLiveSignals(apiSignals.map(mapApiSignal))
    })

    return () => {
      disconnect()
      setConnected(false)
    }
  }, [])

  const mergedSignals = useMemo<ZenithSignal[]>(() => {
    if (liveSignals.length === 0) return SIGNALS
    const apiById     = new Map(liveSignals.map(s => [s.id, s]))
    const apiBySymbol = new Map(liveSignals.map(s => [s.symbol, s]))
    const base = SIGNALS.filter(s => !apiBySymbol.has(s.symbol))
    return [...liveSignals, ...base.filter(s => !apiById.has(s.id))]
  }, [liveSignals])

  const filtered = useMemo(() =>
    mergedSignals.filter(s => {
      if (filterStatus !== 'all' && s.status !== filterStatus) return false
      if (filterDir !== 'all' && s.direction !== filterDir)    return false
      return true
    }),
  [mergedSignals, filterStatus, filterDir])

  return (
    <div className="p-6 space-y-6">

      {/* ── Oracle Panel ─────────────────────────────────────────────────── */}
      <OraclePanel connected={connected} />

      <div className="flex items-start justify-between gap-4">
        <Header title="Señales Mango IA" subtitle="Predicciones del modelo con estimación de incertidumbre" />
        <div className="flex items-center gap-2 shrink-0 mt-1">
          {connected ? (
            <>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-[#1D9BF0] bg-[#1D9BF0]/10 border border-[#1D9BF0]/25 px-2.5 py-1 rounded-full">
                <Radio size={10} className="animate-pulse" />
                LIVE
              </span>
              <span className="text-[10px] text-[#1D9BF0]">Conectado al modelo</span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1.5 text-xs text-[#71767B] bg-[#2F3336] border border-[#3E4144] px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-[#71767B]" />
                DEMO
              </span>
              <span className="text-[10px] text-[#71767B]">Modo demo</span>
            </>
          )}
        </div>
      </div>

      {/* Resumen de performance */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Win Rate', value: `${(PERFORMANCE.winRate * 100).toFixed(1)}%`,  color: '#1D9BF0' },
          { label: 'Sharpe',   value: PERFORMANCE.sharpeRatio.toFixed(2),             color: '#1D9BF0' },
          { label: 'Avg P&L',  value: `+${PERFORMANCE.avgPnlBps} bps`,               color: '#1D9BF0' },
          { label: 'Max DD',   value: `${PERFORMANCE.maxDrawdownBps} bps`,            color: '#f59e0b' },
        ].map(m => (
          <div key={m.label} className="bg-[#16181C] border border-[#2F3336] rounded-xl p-4">
            <div className="text-[#71767B] text-xs mb-1 uppercase tracking-wide">{m.label}</div>
            <div className="text-2xl font-black font-mono" style={{ color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Gráfico P&L acumulado */}
      <div className="bg-[#16181C] border border-[#2F3336] rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[#2F3336]">
          <TrendingUp size={14} className="text-[#1D9BF0]" />
          <span className="text-[#E7E9EA] font-semibold text-sm">P&L Acumulado — últimos 60 días hábiles</span>
          <span className="ml-auto text-xs text-[#71767B]">En basis points (bps)</span>
        </div>
        <div className="p-4">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={dailyPnL} margin={{ top: 4, right: 4, bottom: 0, left: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2F3336" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: '#71767B', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                minTickGap={40}
                tickFormatter={d => d.slice(5)}
              />
              <YAxis
                tick={{ fill: '#71767B', fontSize: 10, fontFamily: 'ui-monospace, monospace' }}
                axisLine={false}
                tickLine={false}
                width={48}
                tickFormatter={v => `${v > 0 ? '+' : ''}${v}`}
              />
              <Tooltip
                contentStyle={{ background: '#16181C', border: '1px solid #2F3336', borderRadius: '8px', fontSize: '11px' }}
                labelStyle={{ color: '#71767B' }}
                formatter={(v) => { const n = Number(v ?? 0); return [`${n > 0 ? '+' : ''}${n} bps`, 'P&L acum.'] }}
              />
              <ReferenceLine y={0} stroke="#3E4144" strokeDasharray="4 2" />
              <Line
                type="monotone"
                dataKey="cumPnlBps"
                stroke="#1D9BF0"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#1D9BF0', stroke: '#16181C', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Descripción del modelo */}
      <div className="bg-[#000000] border border-[#2F3336] rounded-xl p-5 flex gap-4">
        <div className="w-10 h-10 rounded-xl bg-[#1D9BF0]/15 border border-[#1D9BF0]/20 flex items-center justify-center shrink-0">
          <Brain size={18} className="text-[#1D9BF0]" />
        </div>
        <div>
          <div className="text-[#E7E9EA] font-semibold text-sm mb-1">Cómo interpreta Mango cada señal</div>
          <p className="text-[#71767B] text-xs leading-relaxed">
            Cada señal incluye <span className="text-[#E7E9EA]">probabilidad de ganancia</span> (Multi-Task Head),{' '}
            <span className="text-[#E7E9EA]">P&L esperado en bps</span> y{' '}
            <span className="text-[#E7E9EA]">estimación de incertidumbre aleatórica</span> (σ).
            Las señales con incertidumbre &gt; 20% se marcan como "baja confianza" y tienen tamaño reducido.
            Los <span className="text-[#E7E9EA]">Attention Peaks</span> muestran las features con mayor peso
            en el mecanismo de atención del Transformer para esa predicción específica.
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-[#71767B] text-xs">
          <Filter size={12} />
          <span>Estado:</span>
        </div>
        {(['all', 'active', 'pending', 'closed_win', 'closed_loss'] as FilterStatus[]).map(f => (
          <button
            key={f}
            onClick={() => setFilterStatus(f)}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
              filterStatus === f
                ? 'bg-[#1D9BF0]/15 text-[#1D9BF0] border border-[#1D9BF0]/20'
                : 'text-[#71767B] border border-[#2F3336] hover:border-[#3E4144] hover:text-[#E7E9EA]'
            }`}
          >
            {STATUS_LABEL[f]}
          </button>
        ))}

        <div className="flex items-center gap-1.5 text-[#71767B] text-xs ml-4">
          <Zap size={12} />
          <span>Dirección:</span>
        </div>
        {(['all', 'LONG', 'SHORT'] as FilterDir[]).map(d => (
          <button
            key={d}
            onClick={() => setFilterDir(d)}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
              filterDir === d
                ? 'bg-[#1D9BF0]/15 text-[#1D9BF0] border border-[#1D9BF0]/20'
                : 'text-[#71767B] border border-[#2F3336] hover:border-[#3E4144] hover:text-[#E7E9EA]'
            }`}
          >
            {d === 'all' ? 'Todas' : d}
          </button>
        ))}

        <span className="ml-auto text-xs text-[#71767B]">
          {filtered.length} señales · {mergedSignals.length} total
          {liveSignals.length > 0 ? ` (${liveSignals.length} en vivo)` : ''}
        </span>
      </div>

      {/* Grilla de señales */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(s => (
          <SignalCard key={s.id} signal={s} />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-3 py-12 text-center text-[#71767B] text-sm">
            No hay señales que coincidan con los filtros aplicados.
          </div>
        )}
      </div>
    </div>
  )
}
