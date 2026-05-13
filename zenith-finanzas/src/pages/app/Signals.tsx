import { useState } from 'react'
import { Zap, Filter, Brain, TrendingUp } from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, ReferenceLine,
} from 'recharts'
import Header from '@/components/Header'
import SignalCard from '@/components/SignalCard'
import { SIGNALS, PERFORMANCE, generateDailyPnL } from '@/data/signals'
import type { ZenithSignal } from '@/data/signals'

type FilterStatus = 'all' | ZenithSignal['status']
type FilterDir = 'all' | 'LONG' | 'SHORT'

const dailyPnL = generateDailyPnL(60)

export default function Signals() {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [filterDir, setFilterDir] = useState<FilterDir>('all')

  const filtered = SIGNALS.filter(s => {
    if (filterStatus !== 'all' && s.status !== filterStatus) return false
    if (filterDir !== 'all' && s.direction !== filterDir) return false
    return true
  })

  return (
    <div className="p-6 space-y-6">
      <Header title="Señales Zenith IA" subtitle="Predicciones del modelo con estimación de incertidumbre" />

      {/* Performance overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Win Rate',     value: `${(PERFORMANCE.winRate * 100).toFixed(1)}%`,  color: '#10b981' },
          { label: 'Sharpe',       value: PERFORMANCE.sharpeRatio.toFixed(2),             color: '#6366f1' },
          { label: 'Avg P&L',      value: `+${PERFORMANCE.avgPnlBps} bps`,               color: '#0ea5e9' },
          { label: 'Max DD',       value: `${PERFORMANCE.maxDrawdownBps} bps`,            color: '#f59e0b' },
        ].map(m => (
          <div key={m.label} className="bg-[#111827] border border-[#1e293b] rounded-xl p-4">
            <div className="text-[#64748b] text-xs mb-1 uppercase tracking-wide">{m.label}</div>
            <div className="text-2xl font-black font-mono" style={{ color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Cumulative P&L chart */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[#1e293b]">
          <TrendingUp size={14} className="text-[#10b981]" />
          <span className="text-[#f8fafc] font-semibold text-sm">P&L Acumulado — últimos 60 días hábiles</span>
          <span className="ml-auto text-xs text-[#64748b]">En basis points (bps)</span>
        </div>
        <div className="p-4">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={dailyPnL} margin={{ top: 4, right: 4, bottom: 0, left: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: '#64748b', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                minTickGap={40}
                tickFormatter={d => d.slice(5)}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'ui-monospace, monospace' }}
                axisLine={false}
                tickLine={false}
                width={48}
                tickFormatter={v => `${v > 0 ? '+' : ''}${v}`}
              />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '11px' }}
                labelStyle={{ color: '#64748b' }}
                formatter={(v) => { const n = Number(v ?? 0); return [`${n > 0 ? '+' : ''}${n} bps`, 'P&L acum.'] }}
              />
              <ReferenceLine y={0} stroke="#334155" strokeDasharray="4 2" />
              <Line
                type="monotone"
                dataKey="cumPnlBps"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#10b981', stroke: '#0f172a', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Model insight */}
      <div className="bg-[#0c1221] border border-[#1e293b] rounded-xl p-5 flex gap-4">
        <div className="w-10 h-10 rounded-xl bg-[#6366f1]/15 border border-[#6366f1]/20 flex items-center justify-center shrink-0">
          <Brain size={18} className="text-[#6366f1]" />
        </div>
        <div>
          <div className="text-[#f8fafc] font-semibold text-sm mb-1">Cómo interpreta Zenith cada señal</div>
          <p className="text-[#64748b] text-xs leading-relaxed">
            Cada señal incluye <span className="text-[#f8fafc]">probabilidad de ganancia</span> (Multi-Task Head),{' '}
            <span className="text-[#f8fafc]">P&L esperado en bps</span> y{' '}
            <span className="text-[#f8fafc]">estimación de incertidumbre aleatórica</span> (σ).
            Las señales con incertidumbre &gt; 20% se marcan como "baja confianza" y tienen tamaño reducido.
            Los <span className="text-[#f8fafc]">Attention Peaks</span> muestran las features con mayor peso
            en el mecanismo de atención del Transformer para esa predicción específica.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-[#64748b] text-xs">
          <Filter size={12} />
          <span>Estado:</span>
        </div>
        {(['all', 'active', 'pending', 'closed_win', 'closed_loss'] as FilterStatus[]).map(f => (
          <button
            key={f}
            onClick={() => setFilterStatus(f)}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
              filterStatus === f
                ? 'bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/20'
                : 'text-[#64748b] border border-[#1e293b] hover:border-[#334155] hover:text-[#f8fafc]'
            }`}
          >
            {f === 'all' ? 'Todas' : f === 'active' ? 'Activas' : f === 'pending' ? 'Pendientes' : f === 'closed_win' ? 'Ganadas' : 'Perdidas'}
          </button>
        ))}

        <div className="flex items-center gap-1.5 text-[#64748b] text-xs ml-4">
          <Zap size={12} />
          <span>Dirección:</span>
        </div>
        {(['all', 'LONG', 'SHORT'] as FilterDir[]).map(d => (
          <button
            key={d}
            onClick={() => setFilterDir(d)}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
              filterDir === d
                ? 'bg-[#6366f1]/15 text-[#6366f1] border border-[#6366f1]/20'
                : 'text-[#64748b] border border-[#1e293b] hover:border-[#334155] hover:text-[#f8fafc]'
            }`}
          >
            {d === 'all' ? 'Todas' : d}
          </button>
        ))}

        <span className="ml-auto text-xs text-[#64748b]">{filtered.length} señales</span>
      </div>

      {/* Signal grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(s => (
          <SignalCard key={s.id} signal={s} />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-3 py-12 text-center text-[#64748b] text-sm">
            No hay señales que coincidan con los filtros aplicados.
          </div>
        )}
      </div>
    </div>
  )
}
