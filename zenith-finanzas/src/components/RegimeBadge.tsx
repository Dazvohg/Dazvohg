import type { MarketRegime } from '@/data/market'

interface Props {
  regime: MarketRegime
  confidence: number  // 0–1
}

export default function RegimeBadge({ regime, confidence }: Props) {
  return (
    <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[#64748b] text-xs font-medium uppercase tracking-wide">Régimen Detectado</span>
        <span className="text-[#64748b] text-xs">mango-v2.0</span>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-3 h-3 rounded-full pulse-dot shrink-0"
          style={{ background: regime.color }}
        />
        <span className="text-[#f8fafc] font-semibold text-sm">{regime.label}</span>
      </div>

      <p className="text-[#64748b] text-xs leading-relaxed mb-3">{regime.description}</p>

      {/* Confidence bar */}
      <div>
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-[#64748b]">Confianza del modelo</span>
          <span className="font-mono text-[#f8fafc]">{(confidence * 100).toFixed(1)}%</span>
        </div>
        <div className="h-1.5 bg-[#1e293b] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${confidence * 100}%`, background: regime.color }}
          />
        </div>
      </div>
    </div>
  )
}
