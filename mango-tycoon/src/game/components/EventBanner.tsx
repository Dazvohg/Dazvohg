import { AnimatePresence, motion } from 'framer-motion'
import { useGameStore } from '../store/gameStore'

const COLORS: Record<string, string> = {
  dolar_blue: 'from-yellow-900/80 to-yellow-800/80 border-yellow-600',
  crisis:     'from-red-900/80 to-red-800/80 border-red-600',
  boom:       'from-green-900/80 to-green-800/80 border-green-600',
  cepo:       'from-orange-900/80 to-orange-800/80 border-orange-600',
  rate_change:'from-blue-900/80 to-blue-800/80 border-blue-600',
  inflation:  'from-purple-900/80 to-purple-800/80 border-purple-600',
}

export default function EventBanner() {
  const { activeEvent } = useGameStore()

  return (
    <AnimatePresence>
      {activeEvent && (
        <motion.div
          key={activeEvent.id}
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className={`mb-4 p-3 rounded-xl border bg-gradient-to-r ${
            COLORS[activeEvent.type] ?? 'from-gray-800 to-gray-700 border-gray-600'
          }`}
        >
          <p className="font-bold text-sm">{activeEvent.title}</p>
          <p className="text-xs text-gray-300 mt-0.5">{activeEvent.description}</p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
