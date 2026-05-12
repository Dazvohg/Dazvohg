import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, ShoppingCart, Briefcase, Target, Trophy, LogOut } from 'lucide-react'
import { useAuthStore } from '../game/store/authStore'
import { useGameStore } from '../game/store/gameStore'

const NAV_ITEMS = [
  { to: '/game',            icon: LayoutDashboard, label: 'Inicio',   end: true },
  { to: '/game/market',     icon: ShoppingCart,    label: 'Mercado',  end: false },
  { to: '/game/portfolio',  icon: Briefcase,       label: 'Portfolio',end: false },
  { to: '/game/objectives', icon: Target,          label: 'Objetivos',end: false },
  { to: '/game/leaderboard',icon: Trophy,          label: 'Ranking',  end: false },
]

export default function NavBar() {
  const { signOut } = useAuthStore()
  const { profile } = useGameStore()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <>
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header className="fixed top-0 inset-x-0 z-50 bg-gray-950/90 backdrop-blur border-b border-gray-800">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🥭</span>
            <span className="font-bold text-lg text-mango-400">Mango Tycoon</span>
          </div>

          <div className="flex items-center gap-2">
            {profile && (
              <>
                <div className="flex items-center gap-1.5 bg-gray-900 rounded-xl px-3 py-1.5 border border-mango-700">
                  <span className="text-mango-400 font-bold text-sm tabular-nums">
                    ${profile.mangoCash.toLocaleString('es-AR')}
                  </span>
                  <span className="text-xs text-gray-500">MC</span>
                </div>
                <div className="bg-gray-900 rounded-xl px-2.5 py-1.5 border border-argentina-blue/40">
                  <span className="text-xs text-argentina-blue font-semibold">
                    Nv.{profile.level}
                  </span>
                </div>
              </>
            )}
            <button
              onClick={handleSignOut}
              className="p-2 text-gray-500 hover:text-red-400 transition-colors"
              aria-label="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Bottom nav ──────────────────────────────────────────────────── */}
      <nav className="fixed bottom-0 inset-x-0 z-50 bg-gray-950/95 backdrop-blur border-t border-gray-800 safe-area-pb">
        <div className="flex items-center justify-around py-2 px-2 max-w-lg mx-auto">
          {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'text-mango-400 bg-mango-400/10'
                    : 'text-gray-500 hover:text-gray-300'
                }`
              }
            >
              <Icon size={20} />
              <span className="text-xs">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  )
}
