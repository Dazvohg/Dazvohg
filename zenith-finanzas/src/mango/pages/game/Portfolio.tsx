import { Link } from 'react-router-dom'
import { TrendingUp } from 'lucide-react'
import { useGameStore } from '../../game/store/gameStore'
import AssetCard from '../../game/components/AssetCard'
import PortfolioChart from '../../game/components/PortfolioChart'

export default function Portfolio() {
  const { ownedAssets } = useGameStore()

  const portfolioValue = ownedAssets.reduce((s, oa) => s + oa.asset.price * oa.quantity, 0)
  const dailyIncome = ownedAssets.reduce(
    (s, oa) => s + (oa.asset.price * oa.quantity * oa.asset.yieldRate) / 100,
    0,
  )

  if (ownedAssets.length === 0) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-6xl">📭</p>
        <p className="text-gray-400">No tenés activos todavía.</p>
        <Link to="/app/mango/game/market" className="btn-primary inline-block">
          Ir al Mercado
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Mi Portfolio</h2>

      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <p className="text-xs text-gray-400 mb-1">Valor Total</p>
          <p className="font-bold text-mango-400">${portfolioValue.toLocaleString('es-AR')} MC</p>
        </div>
        <div className="card">
          <div className="flex items-center gap-1 mb-1">
            <TrendingUp size={12} className="text-green-400" />
            <p className="text-xs text-gray-400">Renta Diaria</p>
          </div>
          <p className="font-bold text-green-400">
            +${Math.round(dailyIncome).toLocaleString('es-AR')} MC
          </p>
        </div>
      </div>

      <PortfolioChart ownedAssets={ownedAssets} />

      <div className="space-y-3">
        {ownedAssets.map((oa) => (
          <AssetCard key={oa.id} asset={oa.asset} owned={oa} mode="portfolio" />
        ))}
      </div>
    </div>
  )
}
