import { Link } from 'react-router-dom'
import { TrendingUp, Building2, Target, Star } from 'lucide-react'
import { useGameStore } from '../../game/store/gameStore'
import { xpToNextLevel } from '../../game/engine/economy'
import PortfolioChart from '../../game/components/PortfolioChart'

export default function Dashboard() {
  const { profile, ownedAssets, playerObjectives } = useGameStore()

  if (!profile) {
    return (
      <div className="text-center py-16 text-gray-500 animate-pulse">Cargando…</div>
    )
  }

  const portfolioValue = ownedAssets.reduce((s, oa) => s + oa.asset.price * oa.quantity, 0)
  const netWorth = profile.mangoCash + portfolioValue
  const dailyIncome = ownedAssets.reduce(
    (s, oa) => s + (oa.asset.price * oa.quantity * oa.asset.yieldRate) / 100,
    0,
  )
  const pendingCount = playerObjectives.filter((po) => !po.completedAt).length
  const readyCount   = playerObjectives.filter((po) => po.readyToClaim && !po.completedAt).length
  const xpNeeded     = xpToNextLevel(profile.level)
  const xpPct        = Math.min((profile.totalInvested / xpNeeded) * 100, 100)

  return (
    <div className="space-y-4">
      {/* Net worth card */}
      <div className="card bg-gradient-to-br from-mango-900/40 to-gray-900 border-mango-700/50">
        <p className="text-xs text-gray-400 mb-1">Patrimonio Neto</p>
        <p className="text-3xl font-bold text-mango-400 tabular-nums">
          ${netWorth.toLocaleString('es-AR')}
          <span className="text-base font-normal text-gray-500 ml-1">MC</span>
        </p>
        {dailyIncome > 0 && (
          <p className="text-xs text-green-400 mt-1">
            +${Math.round(dailyIncome).toLocaleString('es-AR')} MC / día en rentas
          </p>
        )}

        {/* XP bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Nivel {profile.level}</span>
            <span>Nivel {profile.level + 1}</span>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-mango-400 rounded-full transition-all duration-700"
              style={{ width: `${xpPct}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 mt-1 text-right">
            ${profile.totalInvested.toLocaleString('es-AR')} / ${xpNeeded.toLocaleString('es-AR')} invertido
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp size={14} className="text-green-400" />
            <span className="text-xs text-gray-400">Portfolio</span>
          </div>
          <p className="font-bold">${portfolioValue.toLocaleString('es-AR')} MC</p>
        </div>
        <div className="card">
          <div className="flex items-center gap-1.5 mb-1">
            <Building2 size={14} className="text-argentina-blue" />
            <span className="text-xs text-gray-400">Activos</span>
          </div>
          <p className="font-bold">{ownedAssets.length} propiedades</p>
        </div>
        <div className="card relative">
          <div className="flex items-center gap-1.5 mb-1">
            <Target size={14} className="text-mango-400" />
            <span className="text-xs text-gray-400">Objetivos</span>
          </div>
          <p className="font-bold">{pendingCount} pendientes</p>
          {readyCount > 0 && (
            <span className="absolute top-3 right-3 bg-mango-500 text-gray-900 text-xs font-bold
                             rounded-full w-5 h-5 flex items-center justify-center">
              {readyCount}
            </span>
          )}
        </div>
        <div className="card">
          <div className="flex items-center gap-1.5 mb-1">
            <Star size={14} className="text-yellow-400" />
            <span className="text-xs text-gray-400">Nivel</span>
          </div>
          <p className="font-bold">Nivel {profile.level}</p>
        </div>
      </div>

      {/* Portfolio chart */}
      {ownedAssets.length > 0 && <PortfolioChart ownedAssets={ownedAssets} />}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/game/market"     className="btn-primary text-center text-sm">🛒 Mercado</Link>
        <Link to="/game/objectives" className="btn-secondary text-center text-sm">🎯 Objetivos</Link>
      </div>

      {/* Recent assets */}
      {ownedAssets.length > 0 && (
        <div className="card">
          <p className="text-sm font-bold mb-3">Tus activos</p>
          <div className="space-y-3">
            {ownedAssets.slice(0, 5).map((oa) => (
              <div key={oa.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg shrink-0">{oa.asset.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{oa.asset.name}</p>
                    <p className="text-xs text-gray-500">×{oa.quantity}</p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className="text-xs font-bold text-mango-400">
                    ${(oa.asset.price * oa.quantity).toLocaleString('es-AR')} MC
                  </p>
                  <p className="text-xs text-green-400">+{oa.asset.yieldRate}%/día</p>
                </div>
              </div>
            ))}
          </div>
          {ownedAssets.length > 5 && (
            <Link to="/game/portfolio" className="block text-center text-xs text-argentina-blue mt-3 hover:opacity-80">
              Ver todos ({ownedAssets.length}) →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
