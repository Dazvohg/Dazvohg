import type { ZenithSignal } from '@/data/signals'
import { TrendingUp, TrendingDown, Minus, Clock, Zap } from 'lucide-react'

interface Props {
  signal: ZenithSignal
  compact?: boolean
}

const STATUS_STYLE: Record<ZenithSignal['status'], { label: string; class: string }> = {
  active:      { label: 'Activa',    class: 'text-[#10b981] bg-[#064e3b]/40 border-[#10b981]/30' },
  pending:     { label: 'Pendiente', class: 'text-[#f59e0b] bg-[#78350f]/40 border-[#f59e0b]/30' },
  closed_win:  { label: 'Ganada',    class: 'text-[#0ea5e9] bg-[#0c4a6e]/40 border-[#0ea5e9]/30' },
  closed_loss: { label: 'Perdida',   class: 'text-[#ef4444] bg-[#450a0a]/40 border-[#ef4444]/30' },
}

function timeSince(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ${m % 60}m`
  return `${Math.floor(h / 24)}d`
}

export default function SignalCard({ signal, compact = false }: Props) {
  const { label: statusLabel, class: statusClass } = STATUS_STYLE[signal.status]
  const isLong = signal.direction === 'LONG'
  const isPositive = signal.pnlBps >= 0

  const DirIcon = isLong ? TrendingUp : signal.direction === 'SHORT' ? TrendingDown : Minus
  const dirColor = isLong ? '#10b981' : signal.direction === 'SHORT' ? '#ef4444' : '#64748b'

  return (
    <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-4 hover:border-[#334155] transition-colors">
      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: `${dirColor}18`, border: `1px solid ${dirColor}30` }}
          >
            <DirIcon size={16} style={{ color: dirColor }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[#f8fafc] font-bold text-sm font-mono">{signal.symbol}</span>
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase"
                style={{ color: dirColor, background: `${dirColor}18`, borderColor: `${dirColor}30` }}
              >
                {signal.direction}
              </span>
            </div>
            <span className="text-[#64748b] text-xs">{signal.name}</span>
          </div>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusClass}`}>
          {statusLabel}
        </span>
      </div>

      {!compact && (
        <>
          {/* Probability */}
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[#64748b]">Probabilidad modelo</span>
              <span className="font-mono text-[#f8fafc]">{(signal.probability * 100).toFixed(1)}%</span>
            </div>
            <div className="h-1 bg-[#1e293b] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${signal.probability * 100}%`, background: dirColor }}
              />
            </div>
            <div className="flex justify-between text-[10px] mt-1">
              <span className="text-[#64748b]">Incertidumbre: {(signal.uncertainty * 100).toFixed(1)}%</span>
              <span className="text-[#64748b]">{signal.timeframe} · {signal.regime}</span>
            </div>
          </div>

          {/* Price levels */}
          <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
            <div className="bg-[#0f172a] rounded-lg p-2 text-center">
              <div className="text-[#64748b] mb-0.5">Entrada</div>
              <div className="font-mono text-[#f8fafc]">${signal.entryPrice.toFixed(2)}</div>
            </div>
            <div className="bg-[#0f172a] rounded-lg p-2 text-center">
              <div className="text-[#10b981] mb-0.5">Target</div>
              <div className="font-mono text-[#10b981]">${signal.targetPrice.toFixed(2)}</div>
            </div>
            <div className="bg-[#0f172a] rounded-lg p-2 text-center">
              <div className="text-[#ef4444] mb-0.5">Stop</div>
              <div className="font-mono text-[#ef4444]">${signal.stopLoss.toFixed(2)}</div>
            </div>
          </div>
        </>
      )}

      {/* PnL + time */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <Zap size={11} className="text-[#6366f1]" />
          <span className="text-[#64748b]">P&L:</span>
          <span className={`font-mono font-semibold ${isPositive ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
            {isPositive ? '+' : ''}{signal.pnlBps} bps
          </span>
        </div>
        <div className="flex items-center gap-1 text-[#64748b]">
          <Clock size={11} />
          <span>{timeSince(signal.createdAt)}</span>
        </div>
      </div>

      {!compact && signal.attentionPeaks.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[#1e293b]">
          <div className="text-[#64748b] text-[10px] mb-1.5 uppercase tracking-wide">Top Attention Peaks</div>
          <div className="flex flex-wrap gap-1">
            {signal.attentionPeaks.map((p, i) => (
              <span key={i} className="text-[10px] text-[#6366f1] bg-[#1e1b4b]/40 border border-[#6366f1]/20 px-1.5 py-0.5 rounded">
                {p}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
