import type { ReactNode } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface Props {
  label: string
  value: string
  change?: string
  changePositive?: boolean
  icon?: ReactNode
  accent?: 'green' | 'red' | 'indigo' | 'amber' | 'sky'
  size?: 'sm' | 'md'
}

const ACCENT_COLORS: Record<string, string> = {
  green:  'text-[#1D9BF0] bg-[#0A1929]/40 border-[#1D9BF0]/20',
  red:    'text-[#ef4444] bg-[#450a0a]/40 border-[#ef4444]/20',
  indigo: 'text-[#1D9BF0] bg-[#0A1929]/40 border-[#1D9BF0]/20',
  amber:  'text-[#f59e0b] bg-[#78350f]/40 border-[#f59e0b]/20',
  sky:    'text-[#1D9BF0] bg-[#0c4a6e]/40 border-[#1D9BF0]/20',
}

export default function MetricCard({ label, value, change, changePositive, icon, accent = 'green', size = 'md' }: Props) {
  const accentClass = ACCENT_COLORS[accent]

  return (
    <div className="bg-[#16181C] border border-[#2F3336] rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[#71767B] text-xs font-medium uppercase tracking-wide">{label}</span>
        {icon && (
          <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${accentClass}`}>
            {icon}
          </div>
        )}
      </div>
      <div className="flex items-end gap-2">
        <span className={`font-mono font-bold ${size === 'md' ? 'text-2xl' : 'text-lg'} text-[#E7E9EA]`}>
          {value}
        </span>
        {change !== undefined && (
          <span className={`flex items-center gap-0.5 text-xs font-mono mb-0.5 ${
            changePositive ? 'text-[#1D9BF0]' : 'text-[#ef4444]'
          }`}>
            {changePositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {change}
          </span>
        )}
      </div>
    </div>
  )
}
