import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Activity, Zap, Briefcase,
  GraduationCap, Wallet, BarChart3, Settings, LogOut,
} from 'lucide-react'

const NAV = [
  { to: '/app/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/app/terminal',   icon: Activity,        label: 'Terminal' },
  { to: '/app/signals',    icon: Zap,             label: 'Señales IA',  badge: '4' },
  { to: '/app/portfolio',  icon: Briefcase,        label: 'Portfolio' },
  { to: '/app/finanzas',   icon: Wallet,           label: 'Finanzas' },
  { to: '/app/simulador',  icon: BarChart3,        label: 'Simulador' },
  { to: '/app/academia',   icon: GraduationCap,   label: 'Academia' },
]

export default function Sidebar() {
  const { pathname } = useLocation()

  return (
    <aside className="w-56 min-h-screen bg-[#0c1221] border-r border-[#1e293b] flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#1e293b]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#10b981] to-[#6366f1] flex items-center justify-center">
            <span className="text-white text-xs font-black">Z</span>
          </div>
          <div>
            <div className="text-white text-sm font-bold tracking-wide">ZENITH</div>
            <div className="text-[#10b981] text-[10px] tracking-[0.15em] font-medium">FINANZAS</div>
          </div>
        </div>
      </div>

      {/* Model status */}
      <div className="mx-3 mt-3 mb-1 px-3 py-2 rounded-lg bg-[#064e3b]/40 border border-[#10b981]/20 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#10b981] pulse-dot shrink-0" />
        <div className="min-w-0">
          <div className="text-[#10b981] text-[10px] font-semibold tracking-wide">MODELO ACTIVO</div>
          <div className="text-[#64748b] text-[10px] truncate">zenith-v2.0 · 8M params</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {NAV.map(({ to, icon: Icon, label, badge }) => {
          const active = pathname.startsWith(to)
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-[#10b981]/10 text-[#10b981] font-medium'
                  : 'text-[#64748b] hover:text-[#f8fafc] hover:bg-[#1e293b]'
              }`}
            >
              <Icon size={16} />
              {label}
              {badge && (
                <span className="ml-auto bg-[#10b981] text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Ecosystem cross-promo */}
      <div className="px-2 py-2 border-t border-[#1e293b]">
        <a
          href={import.meta.env.VITE_MANGO_URL ?? 'http://localhost:5173'}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-[#1e293b] transition-colors group"
        >
          <span className="text-xl shrink-0">🥭</span>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-[#f8fafc] group-hover:text-[#fbbf24] transition-colors">Mango Tycoon</div>
            <div className="text-[10px] text-[#10b981] tracking-wide">Ecosistema Zenith →</div>
          </div>
        </a>
      </div>

      {/* Bottom */}
      <div className="px-2 pb-4 space-y-0.5 border-t border-[#1e293b] pt-3">
        <Link
          to="/app/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#64748b] hover:text-[#f8fafc] hover:bg-[#1e293b] transition-colors"
        >
          <Settings size={16} /> Configuración
        </Link>
        <Link
          to="/login"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#64748b] hover:text-[#ef4444] hover:bg-[#1e293b] transition-colors"
        >
          <LogOut size={16} /> Cerrar sesión
        </Link>
      </div>
    </aside>
  )
}
