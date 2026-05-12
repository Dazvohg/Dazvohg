import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MapPin, TrendingUp, Lock } from 'lucide-react'
import { useGameStore } from '../../game/store/gameStore'
import { canBuyAsset } from '../../game/engine/reputation'
import { getCurrentSeason, getSeasonalMultiplier } from '../../game/engine/seasonality'
import type { MarketAsset } from '../../types/game'

interface Region {
  id: string
  name: string
  icon: string
  description: string
  assetIds: string[]
  color: string
  highlight: string
}

const REGIONS: Region[] = [
  {
    id: 'caba',
    name: 'CABA & GBA',
    icon: '🏙️',
    description: 'El centro financiero del país. Bolsa, bancos, empresas tech y los grandes clubes.',
    color: 'border-blue-700/50 bg-blue-900/20',
    highlight: 'text-blue-400',
    assetIds: ['ypf', 'mercadolibre', 'techint', 'banco_macro', 'globant', 'depto_palermo', 'local_microcentro', 'oficina_puerto_madero', 'boca', 'river', 'san_lorenzo', 'racing', 'al30', 'gd35', 'lecap', 'on_ypf', 'tango_bar', 'feedlot_pampas', 'casa_tigre'],
  },
  {
    id: 'cordoba',
    name: 'Córdoba',
    icon: '🏔️',
    description: 'La Docta. Centro industrial, universitario y sede de Arcor, Loma Negra y Talleres.',
    color: 'border-purple-700/50 bg-purple-900/20',
    highlight: 'text-purple-400',
    assetIds: ['arcor', 'loma_negra', 'talleres'],
  },
  {
    id: 'santa_fe',
    name: 'Santa Fe & Litoral',
    icon: '🌿',
    description: 'El granero del mundo. Rosario, la soja pampeana y el mayor puerto exportador.',
    color: 'border-green-700/50 bg-green-900/20',
    highlight: 'text-green-400',
    assetIds: ['soja_pampa', 'loft_rosario'],
  },
  {
    id: 'mendoza',
    name: 'Cuyo & Mendoza',
    icon: '🍷',
    description: 'El reino del Malbec y el sol. Bodegas, viñedos y energía solar en San Juan.',
    color: 'border-red-700/50 bg-red-900/20',
    highlight: 'text-red-400',
    assetIds: ['vinedo_mendoza', 'bodega_lujan', 'solar_san_juan'],
  },
  {
    id: 'noa',
    name: 'NOA — Noroeste',
    icon: '🏜️',
    description: 'Salta, Jujuy, Tucumán. Litio, limones y el turismo de las quebradas más coloridas.',
    color: 'border-yellow-700/50 bg-yellow-900/20',
    highlight: 'text-yellow-400',
    assetIds: ['limon_tucuman'],
  },
  {
    id: 'patagonia',
    name: 'Patagonia',
    icon: '🏔️',
    description: 'El fin del mundo rentable. Vaca Muerta, eólica, turismo de lujo y estancias.',
    color: 'border-cyan-700/50 bg-cyan-900/20',
    highlight: 'text-cyan-400',
    assetIds: ['bono_neuquen', 'eolico_chubut', 'vaca_muerta_pozo', 'hotel_bariloche', 'estancia_patagonia'],
  },
  {
    id: 'litoral_norte',
    name: 'Litoral Norte & NEA',
    icon: '💧',
    description: 'Misiones, las Cataratas del Iguazú y la selva misionera. Turismo internacional.',
    color: 'border-teal-700/50 bg-teal-900/20',
    highlight: 'text-teal-400',
    assetIds: ['cataratas_lodge'],
  },
  {
    id: 'pampas',
    name: 'La Pampa & Campo',
    icon: '🐄',
    description: 'La pampa húmeda: soja, maíz, ganadería. El motor económico que financia al país.',
    color: 'border-orange-700/50 bg-orange-900/20',
    highlight: 'text-orange-400',
    assetIds: ['feedlot_pampas', 'soja_pampa'],
  },
]

function RegionCard({ region, assets, onSelect, selected }: {
  region: Region
  assets: MarketAsset[]
  onSelect: () => void
  selected: boolean
}) {
  const { reputation } = useGameStore()
  const season = getCurrentSeason()

  const availableCount = assets.filter((a) => canBuyAsset(a.requiredRep, reputation)).length
  const lockedCount = assets.length - availableCount

  const bestBonus = assets.reduce((best, a) => {
    const m = getSeasonalMultiplier(a.type, season)
    return m > best ? m : best
  }, 1)

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className={`w-full text-left card border ${region.color} ${selected ? 'ring-2 ring-mango-400' : ''} transition-all`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{region.icon}</span>
          <div>
            <p className="font-bold text-sm">{region.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs font-medium ${region.highlight}`}>
                {availableCount} activos
              </span>
              {lockedCount > 0 && (
                <span className="flex items-center gap-0.5 text-xs text-gray-500">
                  <Lock size={10} />{lockedCount} bloqueados
                </span>
              )}
            </div>
          </div>
        </div>
        {bestBonus > 1 && (
          <span className="flex items-center gap-1 text-xs text-green-400 bg-green-400/10 border border-green-400/20 px-2 py-1 rounded-lg shrink-0">
            <TrendingUp size={10} />+{Math.round((bestBonus - 1) * 100)}%
          </span>
        )}
      </div>
      <p className="text-xs text-gray-500 mt-1.5">{region.description}</p>
    </motion.button>
  )
}

function ArgentinaMapSVG({ selectedRegion, onSelect }: { selectedRegion: string | null; onSelect: (id: string) => void }) {
  const fill = (id: string) => selectedRegion === id ? '#f59e0b' : '#374151'
  const stroke = '#1f2937'

  return (
    <svg viewBox="0 0 280 520" className="w-full max-w-xs mx-auto" style={{ filter: 'drop-shadow(0 0 8px rgba(0,0,0,0.5))' }}>
      {/* NOA */}
      <polygon
        points="40,20 160,20 155,110 50,115"
        fill={fill('noa')} stroke={stroke} strokeWidth="2"
        className="cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => onSelect('noa')}
      />
      {/* Litoral Norte / NEA */}
      <polygon
        points="160,20 240,20 240,130 155,110"
        fill={fill('litoral_norte')} stroke={stroke} strokeWidth="2"
        className="cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => onSelect('litoral_norte')}
      />
      {/* Santa Fe & Litoral */}
      <polygon
        points="155,110 240,130 235,210 195,215 155,190"
        fill={fill('santa_fe')} stroke={stroke} strokeWidth="2"
        className="cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => onSelect('santa_fe')}
      />
      {/* Córdoba */}
      <polygon
        points="50,115 155,110 155,190 100,200 60,185"
        fill={fill('cordoba')} stroke={stroke} strokeWidth="2"
        className="cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => onSelect('cordoba')}
      />
      {/* Cuyo & Mendoza */}
      <polygon
        points="30,115 50,115 60,185 50,270 20,255 15,180"
        fill={fill('mendoza')} stroke={stroke} strokeWidth="2"
        className="cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => onSelect('mendoza')}
      />
      {/* La Pampa */}
      <polygon
        points="60,185 100,200 155,190 180,230 160,280 100,285 60,260 50,270"
        fill={fill('pampas')} stroke={stroke} strokeWidth="2"
        className="cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => onSelect('pampas')}
      />
      {/* CABA & GBA */}
      <polygon
        points="195,215 235,210 240,255 210,265 185,255 180,230"
        fill={fill('caba')} stroke={stroke} strokeWidth="2"
        className="cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => onSelect('caba')}
      />
      {/* Patagonia */}
      <polygon
        points="20,255 50,270 60,260 100,285 160,280 170,350 150,420 100,450 50,430 20,390"
        fill={fill('patagonia')} stroke={stroke} strokeWidth="2"
        className="cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => onSelect('patagonia')}
      />
      {/* Tierra del Fuego / far south */}
      <polygon
        points="60,430 100,430 110,480 80,500 50,480"
        fill={fill('patagonia')} stroke={stroke} strokeWidth="2"
        className="cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => onSelect('patagonia')}
      />
      {/* Labels */}
      <text x="95" y="60" textAnchor="middle" fill="#9ca3af" fontSize="9" fontWeight="bold">NOA</text>
      <text x="198" y="75" textAnchor="middle" fill="#9ca3af" fontSize="9" fontWeight="bold">NEA</text>
      <text x="196" y="160" textAnchor="middle" fill="#9ca3af" fontSize="8">Santa Fe</text>
      <text x="105" y="150" textAnchor="middle" fill="#9ca3af" fontSize="8">Córdoba</text>
      <text x="30" y="195" textAnchor="middle" fill="#9ca3af" fontSize="7">Cuyo</text>
      <text x="113" y="245" textAnchor="middle" fill="#9ca3af" fontSize="8">La Pampa</text>
      <text x="212" y="242" textAnchor="middle" fill="#9ca3af" fontSize="8">BsAs</text>
      <text x="90" y="360" textAnchor="middle" fill="#9ca3af" fontSize="9" fontWeight="bold">Patagonia</text>
    </svg>
  )
}

export default function Map() {
  const { marketAssets, ownedAssets, reputation } = useGameStore()
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)
  const navigate = useNavigate()
  const season = getCurrentSeason()

  const getRegionAssets = (region: Region) =>
    marketAssets.filter((a) => region.assetIds.includes(a.id))

  const displayedRegion = selectedRegion
    ? REGIONS.find((r) => r.id === selectedRegion)
    : null

  const displayedAssets = displayedRegion
    ? getRegionAssets(displayedRegion)
    : []

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Mapa de Argentina</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Explorá las 8 regiones y sus activos
          <span className="ml-2 text-mango-400">{season.icon} {season.label}</span>
        </p>
      </div>

      {/* SVG Map */}
      <div className="card bg-gray-900 py-2">
        <ArgentinaMapSVG selectedRegion={selectedRegion} onSelect={setSelectedRegion} />
        {!selectedRegion && (
          <p className="text-center text-xs text-gray-600 mt-1">Tocá una región para explorar sus activos</p>
        )}
      </div>

      {/* Selected region detail */}
      {displayedRegion && displayedAssets.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={`card border ${displayedRegion.color}`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">{displayedRegion.icon}</span>
              <div>
                <p className={`font-bold ${displayedRegion.highlight}`}>{displayedRegion.name}</p>
                <p className="text-xs text-gray-400">{displayedAssets.length} activos disponibles</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedRegion(null)}
              className="text-gray-500 hover:text-gray-300 text-sm"
            >✕</button>
          </div>

          <div className="space-y-2">
            {displayedAssets.map((asset) => {
              const locked = !canBuyAsset(asset.requiredRep, reputation)
              const owned = ownedAssets.find((oa) => oa.assetId === asset.id)
              const seasonMult = getSeasonalMultiplier(asset.type, season)
              const effectiveYield = Math.round(asset.yieldRate * seasonMult * 100) / 100

              return (
                <div
                  key={asset.id}
                  className={`flex items-center justify-between p-3 rounded-xl border ${
                    locked ? 'bg-gray-900/50 border-gray-800 opacity-60' : 'bg-gray-900 border-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{asset.icon}</span>
                    <div>
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-bold">{asset.name}</p>
                        {locked && <Lock size={10} className="text-gray-500" />}
                        {owned && <span className="text-xs text-argentina-blue font-bold">✓ ×{owned.quantity}</span>}
                      </div>
                      <p className="text-xs text-gray-500">${asset.price.toLocaleString('es-AR')} MC</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-bold ${seasonMult > 1 ? 'text-green-400' : 'text-green-400'}`}>
                      +{effectiveYield}%{seasonMult > 1 ? season.icon : ''}
                    </p>
                    <button
                      onClick={() => navigate('/game/market')}
                      className="text-xs text-argentina-blue hover:opacity-80"
                    >
                      Ir al mercado →
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* All regions grid */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Todas las regiones</p>
        {REGIONS.map((region) => (
          <RegionCard
            key={region.id}
            region={region}
            assets={getRegionAssets(region)}
            selected={selectedRegion === region.id}
            onSelect={() => setSelectedRegion(selectedRegion === region.id ? null : region.id)}
          />
        ))}
      </div>
    </div>
  )
}
