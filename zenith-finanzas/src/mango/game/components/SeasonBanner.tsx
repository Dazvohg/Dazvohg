import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { getCurrentSeason } from '../engine/seasonality'

interface SeasonState {
  season: string
  label: string
  icon: string
  description: string
  active_bonuses: { assetType: string; multiplier: number; label: string }[]
  updated_at: string
}

const SEASON_COLORS: Record<string, string> = {
  verano:    'from-yellow-900/40 to-orange-900/30 border-yellow-700/40',
  cosecha:   'from-green-900/40 to-yellow-900/30 border-green-700/40',
  invierno:  'from-blue-900/40 to-indigo-900/30 border-blue-700/40',
  primavera: 'from-pink-900/40 to-green-900/30 border-pink-700/40',
  fiestas:   'from-purple-900/40 to-yellow-900/30 border-purple-700/40',
}

export default function SeasonBanner() {
  const [season, setSeason] = useState<SeasonState | null>(null)
  const [collapsed, setCollapsed] = useState(true)

  useEffect(() => {
    const fallback = getCurrentSeason()
    setSeason({
      season: fallback.season,
      label: fallback.label,
      icon: fallback.icon,
      description: fallback.description,
      active_bonuses: fallback.bonuses,
      updated_at: new Date().toISOString(),
    })

    const load = async () => {
      const { data } = await supabase
        .from('seasonal_state')
        .select('*')
        .eq('id', 1)
        .single()
      if (data) setSeason(data as SeasonState)
    }
    load()

    const channel = supabase
      .channel('seasonal_state')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'seasonal_state' },
        (payload) => setSeason(payload.new as SeasonState))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  if (!season) return null

  const colorClass = SEASON_COLORS[season.season] ?? SEASON_COLORS.verano

  return (
    <motion.div
      layout
      className={`card bg-gradient-to-br ${colorClass} mb-3 cursor-pointer`}
      onClick={() => setCollapsed((v) => !v)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{season.icon}</span>
          <div>
            <p className="text-xs font-bold text-white">{season.label}</p>
            <p className="text-xs text-gray-400">Temporada activa</p>
          </div>
        </div>
        <span className="text-gray-500 text-xs">{collapsed ? '▼' : '▲'}</span>
      </div>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <p className="text-xs text-gray-400 mt-2 mb-3">{season.description}</p>
            <div className="flex flex-wrap gap-2">
              {season.active_bonuses.map((b) => (
                <span
                  key={b.assetType}
                  className={`text-xs px-2 py-1 rounded-lg font-medium ${
                    b.multiplier >= 1
                      ? 'bg-green-400/15 text-green-300'
                      : 'bg-red-400/15 text-red-300'
                  }`}
                >
                  {b.label}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
