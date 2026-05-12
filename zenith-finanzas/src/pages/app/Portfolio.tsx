import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { TrendingUp, TrendingDown, Briefcase } from 'lucide-react'
import Header from '@/components/Header'
import { POSITIONS, SUMMARY } from '@/data/portfolio'
import { generateDailyPnL } from '@/data/signals'

const daily = generateDailyPnL(30)

export default function Portfolio() {
  const totalPnlPositive = SUMMARY.totalPnl > 0

  return (
    <div className="p-6 space-y-6">
      <Header title="Portfolio" subtitle="Estado de posiciones y análisis de riesgo" />

      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-4">
          <div className="text-[#64748b] text-xs mb-1 uppercase tracking-wide">Valor Total</div>
          <div className="text-2xl font-black font-mono text-[#f8fafc]">${SUMMARY.totalValue.toLocaleString()}</div>
        </div>
        <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-4">
          <div className="text-[#64748b] text-xs mb-1 uppercase tracking-wide">P&L Total</div>
          <div className={`text-2xl font-black font-mono ${totalPnlPositive ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
            {totalPnlPositive ? '+' : ''}${SUMMARY.totalPnl.toLocaleString()}
          </div>
          <div className={`text-xs font-mono ${totalPnlPositive ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
            {totalPnlPositive ? '+' : ''}{SUMMARY.totalPnlPct.toFixed(2)}%
          </div>
        </div>
        <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-4">
          <div className="text-[#64748b] text-xs mb-1 uppercase tracking-wide">P&L Hoy</div>
          <div className={`text-2xl font-black font-mono ${SUMMARY.dailyPnl > 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
            {SUMMARY.dailyPnl > 0 ? '+' : ''}${SUMMARY.dailyPnl.toLocaleString()}
          </div>
        </div>
        <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-4">
          <div className="text-[#64748b] text-xs mb-1 uppercase tracking-wide">Invertido</div>
          <div className="text-2xl font-black font-mono text-[#f8fafc]">${SUMMARY.invested.toLocaleString()}</div>
          <div className="text-xs text-[#64748b] font-mono">Cash: ${SUMMARY.cash.toLocaleString()}</div>
        </div>
      </div>

      {/* Charts + positions */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Pie allocation */}
        <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Briefcase size={14} className="text-[#10b981]" />
            <span className="text-[#f8fafc] font-semibold text-sm">Asignación</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={POSITIONS}
                dataKey="value"
                nameKey="symbol"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
              >
                {POSITIONS.map((p, i) => (
                  <Cell key={i} fill={p.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '11px' }}
                formatter={(v: number, name) => [`$${v.toLocaleString()}`, name]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {POSITIONS.filter(p => p.symbol !== 'CASH').map(p => (
              <div key={p.symbol} className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
                <span className="text-[#64748b] flex-1">{p.symbol}</span>
                <span className="font-mono text-[#f8fafc]">{p.allocation.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Daily P&L bar */}
        <div className="xl:col-span-2 bg-[#111827] border border-[#1e293b] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={14} className="text-[#10b981]" />
            <span className="text-[#f8fafc] font-semibold text-sm">P&L Diario — últimos 30 días</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={daily.slice(-30)} margin={{ top: 4, right: 4, bottom: 0, left: 44 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: '#64748b', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                minTickGap={30}
                tickFormatter={d => d.slice(5)}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '11px' }}
                labelStyle={{ color: '#64748b' }}
                formatter={(v: number) => [`${v > 0 ? '+' : ''}${v} bps`, 'P&L']}
              />
              <Bar dataKey="pnlBps" radius={[3, 3, 0, 0]}>
                {daily.slice(-30).map((d, i) => (
                  <Cell key={i} fill={d.pnlBps >= 0 ? '#10b981' : '#ef4444'} opacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Positions table */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1e293b]">
          <span className="text-[#f8fafc] font-semibold text-sm">Posiciones Abiertas</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#1e293b]">
                {['Símbolo', 'Nombre', 'Cant.', 'Costo Prom.', 'Precio Actual', 'Valor', 'P&L', 'P&L %', 'Asignación'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-[#64748b] font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {POSITIONS.map((pos, i) => (
                <tr key={pos.symbol} className={`border-b border-[#1e293b]/50 hover:bg-[#0f172a] transition-colors ${i % 2 === 0 ? '' : 'bg-[#0c1221]/20'}`}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: pos.color }} />
                      <span className="font-mono font-bold text-[#f8fafc]">{pos.symbol}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-[#94a3b8]">{pos.name}</td>
                  <td className="px-5 py-3 font-mono text-[#f8fafc]">{pos.quantity.toLocaleString()}</td>
                  <td className="px-5 py-3 font-mono text-[#f8fafc]">
                    {pos.type === 'cash' ? '—' : `$${pos.avgCost.toFixed(2)}`}
                  </td>
                  <td className="px-5 py-3 font-mono text-[#f8fafc]">
                    {pos.type === 'cash' ? '—' : `$${pos.currentPrice.toFixed(2)}`}
                  </td>
                  <td className="px-5 py-3 font-mono text-[#f8fafc]">${pos.value.toLocaleString()}</td>
                  <td className={`px-5 py-3 font-mono ${pos.pnl >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                    {pos.pnl === 0 ? '—' : `${pos.pnl >= 0 ? '+' : ''}$${pos.pnl.toLocaleString()}`}
                  </td>
                  <td className={`px-5 py-3 font-mono ${pos.pnlPct >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                    {pos.pnlPct === 0 ? '—' : (
                      <span className="flex items-center gap-1">
                        {pos.pnlPct >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {pos.pnlPct >= 0 ? '+' : ''}{pos.pnlPct.toFixed(2)}%
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 bg-[#1e293b] rounded-full w-16 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pos.allocation}%`, background: pos.color }}
                        />
                      </div>
                      <span className="font-mono text-[#64748b]">{pos.allocation.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
