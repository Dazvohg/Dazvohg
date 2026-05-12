import { useState } from 'react'
import { motion } from 'framer-motion'
import { Lock } from 'lucide-react'
import type { MarketAsset, OwnedAsset } from '../../types/game'
import { useGameStore } from '../store/gameStore'
import { canBuyAsset, SECTOR_LABELS, SECTOR_ICONS } from '../engine/reputation'
import { getCurrentSeason, getSeasonalMultiplier } from '../engine/seasonality'

interface Props {
  asset: MarketAsset
  owned?: OwnedAsset
  mode: 'buy' | 'portfolio'
}

const RISK_STYLE: Record<string, string> = {
  low:    'text-green-400 bg-green-400/10 border-green-400/20',
  medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  high:   'text-red-400 bg-red-400/10 border-red-400/20',
}
const RISK_LABEL: Record<string, string> = {
  low: 'Bajo riesgo', medium: 'Riesgo medio', high: 'Alto riesgo',
}

const TYPE_LABEL: Record<string, string> = {
  company:     '🏢 Empresa',
  real_estate: '🏠 Inmueble',
  bond:        '📜 Bono',
  club:        '⚽ Club',
  agriculture: '🌿 Agro',
  tourism:     '✈️ Turismo',
  energy:      '⚡ Energía',
}

export default function AssetCard({ asset, owned, mode }: Props) {
  const { profile, reputation, buyAsset, sellAsset } = useGameStore()
  const [busy, setBusy] = useState(false)
  const [showNote, setShowNote] = useState(false)
  const [error, setError] = useState('')

  const canAfford = (profile?.mangoCash ?? 0) >= asset.price
  const unlocked = canBuyAsset(asset.requiredRep, reputation)

  const season = getCurrentSeason()
  const seasonMultiplier = getSeasonalMultiplier(asset.type, season)
  const effectiveYield = Math.round(asset.yieldRate * seasonMultiplier * 100) / 100
  const hasSeasonal = Math.abs(seasonMultiplier - 1) >= 0.01

  const handleBuy = async () => {
    if (!unlocked) return
    setBusy(true)
    setError('')
    try { await buyAsset(asset.id) }
    catch (e: any) { setError(e.message) }
    finally { setBusy(false) }
  }

  const handleSell = async () => {
    if (!owned) return
    setBusy(true)
    try { await sellAsset(owned.id) }
    finally { setBusy(false) }
  }

  return (
    <motion.div
      layout
      whileHover={unlocked ? { scale: 1.01 } : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`card space-y-3 ${!unlocked ? 'opacity-70' : ''}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-2xl shrink-0">{asset.icon}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-bold text-sm truncate">{asset.name}</p>
              {!unlocked && <Lock size={12} className="text-gray-500 shrink-0" />}
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xs text-gray-500 truncate">{asset.location}</p>
              <span className="text-xs text-gray-600">{TYPE_LABEL[asset.type]}</span>
            </div>
          </div>
        </div>
        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border font-medium ${RISK_STYLE[asset.riskLevel]}`}>
          {RISK_LABEL[asset.riskLevel]}
        </span>
      </div>

      <p className="text-xs text-gray-400">{asset.description}</p>

      {/* Price / yield / qty */}
      <div className="flex items-center justify-between text-sm">
        <div>
          <p className="text-xs text-gray-500">Precio</p>
          <p className="font-bold text-mango-400">${asset.price.toLocaleString('es-AR')} MC</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">Renta/día</p>
          <div className="flex items-center gap-1">
            <p className="font-bold text-green-400">+{effectiveYield}%</p>
            {hasSeasonal && (
              <span className={`text-xs font-medium ${seasonMultiplier > 1 ? 'text-yellow-400' : 'text-red-400'}`}>
                {season.icon}
              </span>
            )}
          </div>
          {hasSeasonal && (
            <p className="text-xs text-gray-600">base {asset.yieldRate}%</p>
          )}
        </div>
        {owned && (
          <div className="text-right">
            <p className="text-xs text-gray-500">Tenés</p>
            <p className="font-bold text-argentina-blue">×{owned.quantity}</p>
          </div>
        )}
      </div>

      {/* Seasonal bonus callout */}
      {hasSeasonal && (
        <div className={`flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-lg ${
          seasonMultiplier > 1
            ? 'bg-green-400/10 border border-green-400/20 text-green-400'
            : 'bg-red-400/10 border border-red-400/20 text-red-400'
        }`}>
          <span>{season.icon}</span>
          <span className="font-medium">{season.label}:</span>
          <span>{seasonMultiplier > 1 ? '+' : ''}{Math.round((seasonMultiplier - 1) * 100)}% esta temporada</span>
        </div>
      )}

      {/* Reputation gate */}
      {!unlocked && asset.requiredRep && (
        <div className="flex items-center gap-2 bg-gray-800/80 rounded-xl px-3 py-2 border border-gray-700">
          <Lock size={14} className="text-gray-400 shrink-0" />
          <div>
            <p className="text-xs text-gray-300 font-medium">Reputación requerida</p>
            <p className="text-xs text-gray-500">
              {SECTOR_ICONS[asset.requiredRep.sector]} {SECTOR_LABELS[asset.requiredRep.sector]}: {asset.requiredRep.points} pts
            </p>
          </div>
        </div>
      )}

      {/* Educational note toggle */}
      <button
        onClick={() => setShowNote(!showNote)}
        className="text-xs text-argentina-blue hover:opacity-80 transition-opacity"
      >
        {showNote ? '▲ Ocultar ficha' : '▼ Ficha educativa'}
      </button>

      {showNote && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-argentina-blue/10 border border-argentina-blue/30 rounded-xl p-3"
        >
          <p className="text-xs text-gray-300">{asset.educationalNote}</p>
        </motion.div>
      )}

      {error && (
        <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Action */}
      {mode === 'buy' && (
        <button
          onClick={handleBuy}
          disabled={busy || !canAfford || !unlocked}
          className="btn-primary w-full text-sm disabled:opacity-50"
        >
          {busy ? 'Comprando…' : !unlocked ? 'Bloqueado — subí tu reputación' : !canAfford ? 'Sin fondos suficientes' : 'Comprar'}
        </button>
      )}
      {mode === 'portfolio' && owned && (
        <button
          onClick={handleSell}
          disabled={busy}
          className="btn-secondary w-full text-sm"
        >
          {busy ? 'Vendiendo…' : 'Vender (−10% comisión)'}
        </button>
      )}
    </motion.div>
  )
}
