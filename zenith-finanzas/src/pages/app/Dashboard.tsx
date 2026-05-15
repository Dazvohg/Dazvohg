import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp, TrendingDown, Zap, Activity,
  ArrowRight, Brain, BarChart2, Lock, Crown,
} from 'lucide-react'
import Header from '@/components/Header'
import MetricCard from '@/components/MetricCard'
import RegimeBadge from '@/components/RegimeBadge'
import SignalCard from '@/components/SignalCard'
import PriceChart from '@/components/PriceChart'
import { INSTRUMENTS, REGIMES } from '@/data/market'
import { SIGNALS, PERFORMANCE } from '@/data/signals'
import { SUMMARY } from '@/data/portfolio'
import { zenithApi, type ModelStatus, type ZenithRegime } from '@/lib/zenithApi'

const staticRegime = { ...REGIMES[0], confidence: 0.847 }
const activeSignals = SIGNALS.filter(s => s.status === 'active' || s.status === 'pending')
const topInstruments = INSTRUMENTS.slice(0, 6)

const ARENA_NAMES_D = ['Marcos G.', 'Laura V.', 'Diego H.', 'Ana P.', 'Carlos M.']
const MEDALS_D = ['👑', '🥈', '🥉']

function ArenaDashCard() {
  const { weekNum, countdown, top3, totalUsers } = useMemo(() => {
    const now = new Date()
    const epochWeek = Math.floor(now.getTime() / (7 * 24 * 60 * 60 * 1000))
    const sunday = new Date(now)
    sunday.setDate(now.getDate() + (7 - now.getDay()) % 7 || 7)
    sunday.setHours(23, 59, 59, 0)
    const diff = sunday.getTime() - now.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const s = epochWeek
    const sorted = [...ARENA_NAMES_D].sort((a, b) => {
      const h = (x: string, seed: number) => [...x].reduce((acc, c) => (acc * 31 + c.charCodeAt(0) + seed) | 0, 0)
      return h(a, s) - h(b, s)
    })
    const base = [22.1, 17.8, 13.4]
    return {
      weekNum: (epochWeek % 52) + 1,
      countdown: `${days}d ${hours}h`,
      top3: sorted.slice(0, 3).map((name, i) => ({ name, ret: base[i] + ((s * (i + 7)) % 41) * 0.1 })),
      totalUsers: 820 + (s % 180),
    }
  }, [])

  return (
    <div className="rounded-2xl border border-[#F59E0B]/25 bg-gradient-to-br from-[#1C1200] to-[#000000] p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[#F59E0B] text-[10px] font-black tracking-widest uppercase mb-0.5">⚔️ Arena Semanal</div>
          <div className="text-white font-black text-base">Semana #{weekNum} · {totalUsers.toLocaleString()} jugadores</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-[#71767B]">Termina en</div>
          <div className="text-[#F59E0B] font-black text-base">{countdown}</div>
        </div>
      </div>
      <div className="space-y-2 mb-4">
        {top3.map((p, i) => (
          <div key={p.name} className="flex items-center gap-2">
            <span className="text-base w-6">{MEDALS_D[i]}</span>
            <span className="flex-1 text-sm font-semibold text-[#E7E9EA]">{p.name}</span>
            <span className="text-sm font-bold text-[#00BA7C]">+{p.ret.toFixed(1)}%</span>
          </div>
        ))}
      </div>
      <Link
        to="/app/signals"
        className="flex items-center justify-center gap-2 w-full py-2 rounded-xl border border-[#F59E0B]/30 text-[#F59E0B] text-xs font-bold hover:bg-[#F59E0B]/10 transition-colors"
      >
        <Lock size={11} /> Ver ranking completo · Pro
      </Link>
    </div>
  )
}

export default function Dashboard() {
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null)
  const [liveRegime, setLiveRegime] = useState<ZenithRegime | null>(null)

  useEffect(() => {
    zenithApi.modelStatus().then(setModelStatus)
    zenithApi.regime().then(setLiveRegime)
  }, [])

  // Merge live regime confidence into the static regime object for RegimeBadge
  const currentRegime = liveRegime
    ? { ...staticRegime, confidence: liveRegime.confidence }
    : staticRegime

  return (
    <div className="p-6 space-y-6">
      <Header title="Dashboard" subtitle="Resumen general del mercado y señales activas" />

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Portfolio"
          value={`$${SUMMARY.totalValue.toLocaleString()}`}
          change={`${SUMMARY.dailyPnlPct > 0 ? '+' : ''}${SUMMARY.dailyPnlPct.toFixed(2)}%`}
          changePositive={SUMMARY.dailyPnlPct > 0}
          icon={<BarChart2 size={14} />}
          accent="green"
        />
        <MetricCard
          label="P&L Diario"
          value={`${SUMMARY.dailyPnl > 0 ? '+$' : '-$'}${Math.abs(SUMMARY.dailyPnl).toLocaleString()}`}
          change={`${SUMMARY.dailyPnlPct > 0 ? '+' : ''}${SUMMARY.dailyPnlPct.toFixed(2)}%`}
          changePositive={SUMMARY.dailyPnl > 0}
          icon={<TrendingUp size={14} />}
          accent="green"
        />
        <MetricCard
          label="Señales Activas"
          value={String(activeSignals.length)}
          change="+2 hoy"
          changePositive
          icon={<Zap size={14} />}
          accent="indigo"
        />
        <MetricCard
          label="Win Rate (30d)"
          value={`${(PERFORMANCE.winRate * 100).toFixed(1)}%`}
          change="vs 62.1% mes ant."
          changePositive
          icon={<Brain size={14} />}
          accent="sky"
        />
      </div>

      {/* Arena + Oracle teasers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Arena Semanal */}
        <ArenaDashCard />

        {/* Oracle teaser */}
        <div className="relative rounded-2xl border border-[#F59E0B]/25 bg-gradient-to-br from-[#1C1200] to-[#000000] p-5 overflow-hidden">
          <div className="flex items-center gap-2 mb-3">
            <Crown size={13} className="text-[#F59E0B]" />
            <span className="text-[#F59E0B] text-[10px] font-black tracking-widest uppercase">Oracle IA · Pro</span>
          </div>
          <div className="text-[#E7E9EA] text-lg font-black mb-1">Señal del Día</div>
          <div className="text-[#00BA7C] text-2xl font-black mb-3">↑ LONG · BTC</div>
          <div className="space-y-1 text-xs font-mono mb-4 blur-sm select-none">
            <div className="flex justify-between"><span className="text-[#71767B]">Entrada</span><span className="text-white">$68,400</span></div>
            <div className="flex justify-between"><span className="text-[#71767B]">Objetivo</span><span className="text-[#00BA7C]">$72,100 (+5.4%)</span></div>
            <div className="flex justify-between"><span className="text-[#71767B]">Stop</span><span className="text-[#F4212E]">$66,200 (-3.2%)</span></div>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50 backdrop-blur-[1px] rounded-2xl">
            <Lock size={18} className="text-[#F59E0B]" />
            <Link to="/app/signals" className="bg-[#F59E0B] text-black text-xs font-black px-4 py-2 rounded-lg hover:bg-[#FBBF24] transition-colors">
              Ver Oracle completo
            </Link>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* MERVAL chart (2 cols) */}
        <div className="xl:col-span-2 bg-[#16181C] border border-[#2F3336] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#2F3336]">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[#E7E9EA] font-semibold font-mono">MERVAL</span>
                <span className="text-xs text-[#71767B]">Índice Merval Argentina</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-black font-mono text-[#E7E9EA]">
                  {INSTRUMENTS[0].price.toLocaleString('es-AR')}
                </span>
                <span className="flex items-center gap-1 text-sm text-[#1D9BF0]">
                  <TrendingUp size={14} />
                  +{INSTRUMENTS[0].changePct.toFixed(2)}%
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {['1H', '4H', '1D', '1W'].map(tf => (
                <button
                  key={tf}
                  className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
                    tf === '1D'
                      ? 'bg-[#1D9BF0]/15 text-[#1D9BF0]'
                      : 'text-[#71767B] hover:text-[#E7E9EA] hover:bg-[#2F3336]'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>
          <div className="p-4">
            <PriceChart symbol="MERVAL" basePrice={INSTRUMENTS[0].price} height={220} />
          </div>
        </div>

        {/* Regime badge */}
        <div className="space-y-4">
          <RegimeBadge regime={currentRegime} confidence={currentRegime.confidence} />

          {/* Live model status from API */}
          <div className="bg-[#16181C] border border-[#2F3336] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className={`w-2 h-2 rounded-full ${modelStatus?.mode === 'neural_net' ? 'bg-[#1D9BF0]' : 'bg-[#f59e0b]'} animate-pulse`} />
              <span className="text-[#E7E9EA] text-sm font-medium">Estado del Modelo</span>
              <span className="ml-auto text-[10px] text-[#71767B]">
                {modelStatus?.mode === 'neural_net' ? 'ZenithNetV2 activo' : 'Modo heurístico'}
              </span>
            </div>
            <div className="space-y-2.5">
              {[
                {
                  label: 'Inferencia',
                  value: modelStatus ? `${modelStatus.inference_ms} ms/pred` : '14 ms/pred',
                  ok: true,
                },
                {
                  label: 'Buffer de replay',
                  value: modelStatus
                    ? `${(modelStatus.buffer_size / 1000).toFixed(1)}K muestras`
                    : '87.4K muestras',
                  ok: true,
                },
                {
                  label: 'Último training',
                  value: modelStatus ? modelStatus.last_training : 'N/A',
                  ok: true,
                },
                {
                  label: 'Avg uncertainty',
                  value: modelStatus
                    ? `${(modelStatus.avg_uncertainty * 100).toFixed(1)}%`
                    : '9.8%',
                  ok: modelStatus ? modelStatus.avg_uncertainty < 0.2 : true,
                },
                {
                  label: 'Régimen actual',
                  value: liveRegime
                    ? `${liveRegime.label} (${(liveRegime.confidence * 100).toFixed(1)}%)`
                    : 'Neutro (84.7%)',
                  ok: true,
                },
              ].map(row => (
                <div key={row.label} className="flex justify-between text-xs">
                  <span className="text-[#71767B]">{row.label}</span>
                  <span className={row.ok ? 'text-[#1D9BF0] font-mono' : 'text-[#ef4444] font-mono'}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Instruments table */}
      <div className="bg-[#16181C] border border-[#2F3336] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2F3336]">
          <span className="text-[#E7E9EA] font-semibold text-sm">Instrumentos Seguidos</span>
          <Link to="/app/terminal" className="flex items-center gap-1 text-xs text-[#1D9BF0] hover:text-[#1A8CD8]">
            Ver terminal <ArrowRight size={12} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#2F3336]">
                {['Símbolo', 'Nombre', 'Precio', 'Cambio', 'Cambio %', 'Volumen', 'Tipo'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-[#71767B] font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topInstruments.map((inst, i) => (
                <tr key={inst.symbol} className={`border-b border-[#2F3336]/50 hover:bg-[#16181C] transition-colors ${i % 2 === 0 ? '' : 'bg-[#000000]/30'}`}>
                  <td className="px-5 py-3 font-mono font-bold text-[#E7E9EA]">{inst.symbol}</td>
                  <td className="px-5 py-3 text-[#8B98A5]">{inst.name}</td>
                  <td className="px-5 py-3 font-mono text-[#E7E9EA]">
                    {inst.symbol === 'MERVAL'
                      ? inst.price.toLocaleString('es-AR')
                      : inst.symbol === 'BTC'
                      ? `$${inst.price.toLocaleString()}`
                      : `$${inst.price.toFixed(2)}`}
                  </td>
                  <td className={`px-5 py-3 font-mono ${inst.change >= 0 ? 'text-[#00BA7C]' : 'text-[#F4212E]'}`}>
                    {inst.change >= 0 ? '+' : ''}{inst.symbol === 'MERVAL' ? inst.change.toLocaleString('es-AR') : inst.change.toFixed(2)}
                  </td>
                  <td className={`px-5 py-3 font-mono ${inst.changePct >= 0 ? 'text-[#00BA7C]' : 'text-[#F4212E]'}`}>
                    <span className="flex items-center gap-1">
                      {inst.changePct >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                      {inst.changePct >= 0 ? '+' : ''}{inst.changePct.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-[#71767B]">
                    {inst.volume >= 1e9
                      ? `${(inst.volume / 1e9).toFixed(1)}B`
                      : inst.volume >= 1e6
                      ? `${(inst.volume / 1e6).toFixed(1)}M`
                      : `${(inst.volume / 1e3).toFixed(0)}K`}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${
                      inst.type === 'adr' ? 'bg-[#1D9BF0]/10 text-[#1D9BF0]' :
                      inst.type === 'bond' ? 'bg-[#f59e0b]/10 text-[#f59e0b]' :
                      inst.type === 'crypto' ? 'bg-[#8b5cf6]/10 text-[#8b5cf6]' :
                      inst.type === 'commodity' ? 'bg-[#1D9BF0]/10 text-[#1D9BF0]' :
                      'bg-[#1D9BF0]/10 text-[#1D9BF0]'
                    }`}>
                      {inst.type}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Active signals */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[#E7E9EA] font-semibold">Señales Activas</h2>
          <Link to="/app/signals" className="flex items-center gap-1 text-xs text-[#1D9BF0] hover:text-[#1A8CD8]">
            Ver todas <ArrowRight size={12} />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {activeSignals.map(s => (
            <SignalCard key={s.id} signal={s} />
          ))}
        </div>
      </div>

      {/* Mango Tycoon cross-promo */}
      <a
        href={import.meta.env.VITE_MANGO_URL ?? 'http://localhost:5173'}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-4 bg-gradient-to-r from-[#78350f]/20 to-[#16181C] border border-[#d97706]/25 rounded-xl p-5 hover:border-[#d97706]/50 transition-colors group"
      >
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#d97706]/20 to-[#f59e0b]/10 border border-[#d97706]/30 flex items-center justify-center shrink-0 text-2xl">
          🥭
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[#E7E9EA] font-bold text-sm group-hover:text-[#fbbf24] transition-colors">Mango Tycoon</span>
            <span className="text-[10px] bg-[#d97706]/15 text-[#d97706] border border-[#d97706]/20 px-1.5 py-0.5 rounded-full">Ecosistema Mango</span>
          </div>
          <p className="text-[#71767B] text-xs">Practicá lo que aprendés acá. Invertí en Argentina como juego — activos reales, economía simulada.</p>
        </div>
        <ArrowRight size={16} className="text-[#d97706] shrink-0 group-hover:translate-x-1 transition-transform" />
      </a>
    </div>
  )
}
