import { useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, Clock, Gift } from 'lucide-react'
import type { PlayerObjective } from '../../types/game'
import { useGameStore } from '../store/gameStore'

export default function ObjectiveCard({ po }: { po: PlayerObjective }) {
  const { claimObjective } = useGameStore()
  const [busy, setBusy] = useState(false)

  const isDone = !!po.completedAt

  const handleClaim = async () => {
    setBusy(true)
    await claimObjective(po.objective.id)
    setBusy(false)
  }

  return (
    <motion.div
      layout
      className={`card space-y-2 transition-opacity ${isDone ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <span className="text-xl shrink-0 mt-0.5">{po.objective.icon}</span>
          <div className="min-w-0">
            <p className="font-bold text-sm">{po.objective.title}</p>
            <p className="text-xs text-gray-400 mt-0.5">{po.objective.description}</p>
          </div>
        </div>
        {isDone ? (
          <CheckCircle size={18} className="text-green-400 shrink-0 mt-0.5" />
        ) : po.readyToClaim ? (
          <Gift size={18} className="text-mango-400 shrink-0 mt-0.5 animate-bounce" />
        ) : (
          <Clock size={18} className="text-gray-600 shrink-0 mt-0.5" />
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-mango-400">
          +{po.objective.reward.toLocaleString('es-AR')} MC
        </span>
        {po.readyToClaim && !isDone && (
          <button onClick={handleClaim} disabled={busy} className="btn-primary text-xs py-1 px-3">
            {busy ? '…' : '¡Cobrar!'}
          </button>
        )}
        {isDone && (
          <span className="text-xs text-green-400">Completado ✓</span>
        )}
      </div>
    </motion.div>
  )
}
