import { Outlet, useNavigate } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuthStore } from '../../game/store/authStore'
import { useGameStore } from '../../game/store/gameStore'
import NavBar from '../../components/NavBar'
import EventBanner from '../../game/components/EventBanner'
import EconomyTicker from '../../game/components/EconomyTicker'
import S from '../../lib/sound'

export default function Game() {
  const { user } = useAuthStore()
  const { loadProfile, incomeNotification, dismissIncomeNotification } = useGameStore()
  const navigate = useNavigate()
  const prevIncome = useRef<number | null>(null)

  useEffect(() => {
    if (user) loadProfile(user.id)
    else navigate('/login')
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  // Play income sound when notification arrives
  useEffect(() => {
    if (incomeNotification && incomeNotification.total > 0 && prevIncome.current !== incomeNotification.total) {
      prevIncome.current = incomeNotification.total
      S.income()
    }
  }, [incomeNotification])

  return (
    <div className="min-h-screen bg-gray-950 pb-24 pt-16">
      <NavBar />

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-0">
        <EconomyTicker />
        <EventBanner />

        {/* Passive income toast */}
        <AnimatePresence>
          {incomeNotification && incomeNotification.total > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="card border-mango-700 bg-gradient-to-br from-mango-900/30 to-gray-900 mb-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <p className="font-bold text-mango-400 text-sm">💰 Rentas acumuladas</p>
                <button
                  onClick={dismissIncomeNotification}
                  className="text-gray-500 hover:text-gray-300 text-sm"
                >
                  ✕
                </button>
              </div>
              <p className="text-2xl font-bold text-mango-300">
                +${incomeNotification.total.toLocaleString('es-AR')} MC
              </p>
              <div className="space-y-1">
                {incomeNotification.breakdown.map((b) => (
                  <div key={b.assetName} className="flex justify-between text-xs text-gray-400">
                    <span>{b.assetName}</span>
                    <span className="text-green-400">+${b.income.toLocaleString('es-AR')}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Outlet />
      </div>
    </div>
  )
}
