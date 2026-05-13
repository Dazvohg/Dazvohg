import type { RepSector, PlayerReputation } from '../../types/game'
import { SECTOR_LABELS, SECTOR_ICONS, getRepTitle } from '../engine/reputation'

interface Props {
  sector: RepSector
  reputation: PlayerReputation
  size?: 'sm' | 'md'
}

export default function ReputationBadge({ sector, reputation, size = 'sm' }: Props) {
  const points = reputation[sector] ?? 0
  const title = getRepTitle(points)
  const pct = Math.min(points, 100)

  if (size === 'md') {
    return (
      <div className="bg-gray-900 rounded-xl p-3 border border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-base">{SECTOR_ICONS[sector]}</span>
            <span className="text-xs font-medium text-gray-300">{SECTOR_LABELS[sector]}</span>
          </div>
          <span className={`text-xs font-bold ${title.color}`}>{title.label}</span>
        </div>
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-mango-400 rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-gray-600 mt-1 text-right">{points}/100</p>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm">{SECTOR_ICONS[sector]}</span>
      <div>
        <p className="text-xs text-gray-500 leading-none">{SECTOR_LABELS[sector]}</p>
        <p className={`text-xs font-bold leading-none mt-0.5 ${title.color}`}>{title.label} · {points}pts</p>
      </div>
    </div>
  )
}
