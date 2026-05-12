import { useState } from 'react'
import { useGameStore } from '../../game/store/gameStore'
import AssetCard from '../../game/components/AssetCard'
import type { AssetType } from '../../types/game'

const FILTERS: { label: string; value: AssetType | 'all' }[] = [
  { label: 'Todo',        value: 'all' },
  { label: '🏢 Empresas', value: 'company' },
  { label: '🏠 Inmuebles',value: 'real_estate' },
  { label: '📜 Bonos',    value: 'bond' },
  { label: '⚽ Clubes',   value: 'club' },
]

export default function Market() {
  const { marketAssets, ownedAssets, profile } = useGameStore()
  const [filter, setFilter] = useState<AssetType | 'all'>('all')

  const visible = filter === 'all'
    ? marketAssets
    : marketAssets.filter((a) => a.type === filter)

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Mercado</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Saldo disponible:{' '}
          <span className="text-mango-400 font-bold">
            ${profile?.mangoCash.toLocaleString('es-AR') ?? 0} MC
          </span>
        </p>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-xl border transition-all ${
              filter === f.value
                ? 'bg-mango-500 border-mango-500 text-gray-900 font-bold'
                : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {visible.map((asset) => (
          <AssetCard
            key={asset.id}
            asset={asset}
            owned={ownedAssets.find((oa) => oa.assetId === asset.id)}
            mode="buy"
          />
        ))}
      </div>
    </div>
  )
}
