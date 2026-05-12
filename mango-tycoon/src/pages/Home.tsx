import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../game/store/authStore'

const FEATURES = [
  { icon: '🏢', label: 'Empresas argentinas' },
  { icon: '🏠', label: 'Bienes Raíces' },
  { icon: '📜', label: 'Bonos del Estado' },
  { icon: '⚽', label: 'Clubes de Fútbol' },
]

export default function Home() {
  const { user } = useAuthStore()

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="w-full max-w-sm"
      >
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          className="text-8xl mb-4 select-none"
        >
          🥭
        </motion.div>

        <h1 className="text-4xl font-bold text-mango-400 mb-2">Mango Tycoon</h1>
        <p className="text-gray-300 text-lg mb-1">Invertí en Argentina. Aprendé jugando.</p>
        <p className="text-gray-500 text-sm mb-8 max-w-xs mx-auto">
          Empresas, bonos, bienes raíces y clubes de fútbol. Todo ficticio, toda la diversión.
        </p>

        <div className="flex flex-col gap-3 w-full">
          {user ? (
            <Link to="/game" className="btn-primary text-center py-3.5 text-lg">
              Seguir jugando →
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn-primary text-center py-3.5 text-lg">
                Empezar a invertir
              </Link>
              <Link to="/login?mode=login" className="btn-secondary text-center py-3">
                Ya tengo cuenta
              </Link>
            </>
          )}
        </div>

        <div className="mt-10 grid grid-cols-2 gap-3">
          {FEATURES.map((f) => (
            <div
              key={f.label}
              className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl p-3"
            >
              <span className="text-xl">{f.icon}</span>
              <span className="text-xs text-gray-400">{f.label}</span>
            </div>
          ))}
        </div>

        <p className="mt-8 text-xs text-gray-600">
          100% ficticio · Sin dinero real · Solo diversión
        </p>
      </motion.div>
    </div>
  )
}
