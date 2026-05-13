import { useState } from 'react'
import { useGameStore } from '../../game/store/gameStore'
import AssetCard from '../../game/components/AssetCard'
import { canBuyAsset } from '../../game/engine/reputation'
import type { AssetType } from '../../types/game'

const TYPE_FILTERS: { label: string; value: AssetType | 'all' }[] = [
  { label: 'Todo',         value: 'all' },
  { label: '🏢 Empresas',  value: 'company' },
  { label: '🏠 Inmuebles', value: 'real_estate' },
  { label: '📜 Bonos',     value: 'bond' },
  { label: '⚽ Clubes',    value: 'club' },
  { label: '🌿 Agro',      value: 'agriculture' },
  { label: '✈️ Turismo',   value: 'tourism' },
  { label: '⚡ Energía',   value: 'energy' },
]

type ShowFilter = 'all' | 'available' | 'locked'

export default function Market() {
  const { marketAssets, ownedAssets, profile, reputation } = useGameStore()
  const [typeFilter, setTypeFilter] = useState<AssetType | 'all'>('all')
  const [showFilter, setShowFilter] = useState<ShowFilter>('all')

  let visible = typeFilter === 'all'
    ? marketAssets
    : marketAssets.filter((a) => a.type === typeFilter)

  if (showFilter === 'available') {
    visible = visible.filter((a) => canBuyAsset(a.requiredRep, reputation))
  } else if (showFilter === 'locked') {
    visible = visible.filter((a) => !canBuyAsset(a.requiredRep, reputation))
  }

  const lockedCount = marketAssets.filter((a) => !canBuyAsset(a.requiredRep, reputation)).length

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Mercado</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Saldo:{' '}
          <span className="text-mango-400 font-bold">
            ${profile?.mangoCash.toLocaleString('es-AR') ?? 0} MC
          </span>
          {lockedCount > 0 && (
            <span className="ml-2 text-gray-600">· {lockedCount} bloqueados por reputación</span>
          )}
        </p>
      </div>

      {/* Type filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setTypeFilter(f.value)}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-xl border transition-all ${
              typeFilter === f.value
                ? 'bg-mango-500 border-mango-500 text-gray-900 font-bold'
                : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Availability filter */}
      <div className="flex gap-2">
        {(['all', 'available', 'locked'] as ShowFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setShowFilter(f)}
            className={`text-xs px-3 py-1 rounded-lg border transition-all ${
              showFilter === f
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-gray-900 border-gray-800 text-gray-500'
            }`}
          >
            {f === 'all' ? 'Todos' : f === 'available' ? 'Disponibles' : '🔒 Bloqueados'}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {visible.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            {showFilter === 'locked'
              ? 'No tenés activos bloqueados en esta categoría.'
              : 'No hay activos para este filtro.'}
          </div>
        ) : (
          visible.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              owned={ownedAssets.find((oa) => oa.assetId === asset.id)}
              mode="buy"
            />
          ))
        )}
      </div>
    </div>
  )
}
