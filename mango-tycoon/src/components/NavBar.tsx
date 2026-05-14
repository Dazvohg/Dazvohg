import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, ShoppingCart, Target, Map, Building2, GraduationCap, LogOut } from 'lucide-react'
import { useAuthStore } from '../game/store/authStore'
import { useGameStore } from '../game/store/gameStore'
import S from '../lib/sound'

const NAV_ITEMS = [
  { to: '/game',            icon: LayoutDashboard, label: 'Inicio',   end: true },
  { to: '/game/market',     icon: ShoppingCart,    label: 'Mercado',  end: false },
  { to: '/game/mapa',       icon: Map,             label: 'Mapa',     end: false },
  { to: '/game/empresa',    icon: Building2,       label: 'Empresa',  end: false },
  { to: '/game/objectives', icon: Target,          label: 'Objetivos',end: false },
  { to: '/game/academia',   icon: GraduationCap,   label: 'Academia', end: false },
]

export default function NavBar() {
  const { signOut } = useAuthStore()
  const { profile, playerObjectives } = useGameStore()
  const navigate = useNavigate()

  const readyCount = playerObjectives.filter((po) => po.readyToClaim && !po.completedAt).length

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
            <div className="flex flex-col leading-tight">
              <span className="font-black text-base text-mango-400 tracking-tight">Mango</span>
              <span className="text-[10px] text-gray-500 font-medium tracking-widest uppercase">Tycoon</span>
            </div>
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
            <a
              href={import.meta.env.VITE_ZENITH_URL ?? 'http://localhost:5174'}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1 bg-gray-900 rounded-xl px-2.5 py-1.5 border border-indigo-700/40 hover:border-indigo-500/60 transition-colors"
              title="Zenith Finanzas"
            >
              <span className="text-xs font-black text-white">Z</span>
              <span className="text-[10px] text-[#10b981] font-semibold tracking-wide">ZENITH</span>
            </a>
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
        <div className="flex items-center justify-around py-1 px-1 max-w-lg mx-auto overflow-x-auto scrollbar-hide">
          {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => {
            const isObjectives = to === '/game/objectives'
            return (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => S.nav()}
                className={({ isActive }) =>
                  `relative flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all duration-200 shrink-0 ${
                    isActive
                      ? 'text-mango-400 bg-mango-400/10'
                      : 'text-gray-500 hover:text-gray-300'
                  }`
                }
              >
                <Icon size={16} />
                <span className="text-[9px]">{label}</span>
                {isObjectives && readyCount > 0 && (
                  <span className="absolute -top-0.5 right-0.5 bg-mango-500 text-gray-900 text-[9px] font-bold
                                   rounded-full w-4 h-4 flex items-center justify-center">
                    {readyCount}
                  </span>
                )}
              </NavLink>
            )
          })}
        </div>
      </nav>
    </>
  )
}
