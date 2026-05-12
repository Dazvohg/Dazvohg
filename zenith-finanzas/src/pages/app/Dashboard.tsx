import { Link } from 'react-router-dom'
import {
  TrendingUp, TrendingDown, Zap, Activity,
  ArrowRight, Brain, BarChart2,
} from 'lucide-react'
import Header from '@/components/Header'
import MetricCard from '@/components/MetricCard'
import RegimeBadge from '@/components/RegimeBadge'
import SignalCard from '@/components/SignalCard'
import PriceChart from '@/components/PriceChart'
import { INSTRUMENTS, REGIMES } from '@/data/market'
import { SIGNALS, PERFORMANCE } from '@/data/signals'
import { SUMMARY } from '@/data/portfolio'

const currentRegime = { ...REGIMES[0], confidence: 0.847 }
const activeSignals = SIGNALS.filter(s => s.status === 'active' || s.status === 'pending')
const topInstruments = INSTRUMENTS.slice(0, 6)

export default function Dashboard() {
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

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* MERVAL chart (2 cols) */}
        <div className="xl:col-span-2 bg-[#111827] border border-[#1e293b] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e293b]">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[#f8fafc] font-semibold font-mono">MERVAL</span>
                <span className="text-xs text-[#64748b]">Índice Merval Argentina</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-black font-mono text-[#f8fafc]">
                  {INSTRUMENTS[0].price.toLocaleString('es-AR')}
                </span>
                <span className="flex items-center gap-1 text-sm text-[#10b981]">
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
                      ? 'bg-[#10b981]/15 text-[#10b981]'
                      : 'text-[#64748b] hover:text-[#f8fafc] hover:bg-[#1e293b]'
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

          {/* Model health */}
          <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity size={14} className="text-[#10b981]" />
              <span className="text-[#f8fafc] text-sm font-medium">Estado del Modelo</span>
            </div>
            <div className="space-y-2.5">
              {[
                { label: 'Inferencia',         value: '14 ms/pred',    ok: true },
                { label: 'Buffer de replay',   value: '87.4K muestras', ok: true },
                { label: 'Último training',    value: 'hace 23 min',   ok: true },
                { label: 'Avg uncertainty',    value: '9.8%',          ok: true },
                { label: 'Señales hoy',        value: '47 generadas',  ok: true },
              ].map(row => (
                <div key={row.label} className="flex justify-between text-xs">
                  <span className="text-[#64748b]">{row.label}</span>
                  <span className={row.ok ? 'text-[#10b981] font-mono' : 'text-[#ef4444] font-mono'}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Instruments table */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e293b]">
          <span className="text-[#f8fafc] font-semibold text-sm">Instrumentos Seguidos</span>
          <Link to="/app/terminal" className="flex items-center gap-1 text-xs text-[#10b981] hover:text-[#059669]">
            Ver terminal <ArrowRight size={12} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#1e293b]">
                {['Símbolo', 'Nombre', 'Precio', 'Cambio', 'Cambio %', 'Volumen', 'Tipo'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-[#64748b] font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topInstruments.map((inst, i) => (
                <tr key={inst.symbol} className={`border-b border-[#1e293b]/50 hover:bg-[#0f172a] transition-colors ${i % 2 === 0 ? '' : 'bg-[#0c1221]/30'}`}>
                  <td className="px-5 py-3 font-mono font-bold text-[#f8fafc]">{inst.symbol}</td>
                  <td className="px-5 py-3 text-[#94a3b8]">{inst.name}</td>
                  <td className="px-5 py-3 font-mono text-[#f8fafc]">
                    {inst.symbol === 'MERVAL'
                      ? inst.price.toLocaleString('es-AR')
                      : inst.symbol === 'BTC'
                      ? `$${inst.price.toLocaleString()}`
                      : `$${inst.price.toFixed(2)}`}
                  </td>
                  <td className={`px-5 py-3 font-mono ${inst.change >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                    {inst.change >= 0 ? '+' : ''}{inst.symbol === 'MERVAL' ? inst.change.toLocaleString('es-AR') : inst.change.toFixed(2)}
                  </td>
                  <td className={`px-5 py-3 font-mono ${inst.changePct >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                    <span className="flex items-center gap-1">
                      {inst.changePct >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                      {inst.changePct >= 0 ? '+' : ''}{inst.changePct.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-[#64748b]">
                    {inst.volume >= 1e9
                      ? `${(inst.volume / 1e9).toFixed(1)}B`
                      : inst.volume >= 1e6
                      ? `${(inst.volume / 1e6).toFixed(1)}M`
                      : `${(inst.volume / 1e3).toFixed(0)}K`}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${
                      inst.type === 'adr' ? 'bg-[#10b981]/10 text-[#10b981]' :
                      inst.type === 'bond' ? 'bg-[#f59e0b]/10 text-[#f59e0b]' :
                      inst.type === 'crypto' ? 'bg-[#8b5cf6]/10 text-[#8b5cf6]' :
                      inst.type === 'commodity' ? 'bg-[#0ea5e9]/10 text-[#0ea5e9]' :
                      'bg-[#6366f1]/10 text-[#6366f1]'
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
          <h2 className="text-[#f8fafc] font-semibold">Señales Activas</h2>
          <Link to="/app/signals" className="flex items-center gap-1 text-xs text-[#10b981] hover:text-[#059669]">
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
        className="flex items-center gap-4 bg-gradient-to-r from-[#78350f]/20 to-[#111827] border border-[#d97706]/25 rounded-xl p-5 hover:border-[#d97706]/50 transition-colors group"
      >
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#d97706]/20 to-[#f59e0b]/10 border border-[#d97706]/30 flex items-center justify-center shrink-0 text-2xl">
          🥭
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[#f8fafc] font-bold text-sm group-hover:text-[#fbbf24] transition-colors">Mango Tycoon</span>
            <span className="text-[10px] bg-[#d97706]/15 text-[#d97706] border border-[#d97706]/20 px-1.5 py-0.5 rounded-full">Ecosistema Zenith</span>
          </div>
          <p className="text-[#64748b] text-xs">Practicá lo que aprendés acá. Invertí en Argentina como juego — activos reales, economía simulada.</p>
        </div>
        <ArrowRight size={16} className="text-[#d97706] shrink-0 group-hover:translate-x-1 transition-transform" />
      </a>
    </div>
  )
}
