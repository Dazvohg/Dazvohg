import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Activity, Zap, Briefcase,
  GraduationCap, Wallet, BarChart3, Settings, LogOut,
} from 'lucide-react'

const NAV = [
  { to: '/app/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/app/terminal',   icon: Activity,        label: 'Terminal' },
  { to: '/app/signals',    icon: Zap,             label: 'Señales IA', badge: '4' },
  { to: '/app/portfolio',  icon: Briefcase,       label: 'Portfolio' },
  { to: '/app/finanzas',   icon: Wallet,          label: 'Finanzas' },
  { to: '/app/simulador',  icon: BarChart3,       label: 'Simulador' },
  { to: '/app/academia',   icon: GraduationCap,   label: 'Academia' },
]

export default function Sidebar() {
  const { pathname } = useLocation()
  const inMango = pathname.startsWith('/app/mango')

  return (
    <aside className="w-64 min-h-screen flex flex-col shrink-0 border-r border-[#2F3336] bg-black">

      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <div className="px-5 py-5 border-b border-[#2F3336]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#1D9BF0] flex items-center justify-center shadow-lg shadow-[#1D9BF0]/20">
            <span className="text-white text-base font-black">M</span>
          </div>
          <div>
            <div className="text-white text-base font-bold tracking-tight leading-none">Mango</div>
            <div className="text-[#71767B] text-[11px] mt-0.5">Plataforma de inversión</div>
          </div>
        </div>
      </div>

      {/* ── Modelo activo ────────────────────────────────────────────────── */}
      <div className="mx-4 mt-4 mb-1 px-3 py-2.5 rounded-xl bg-[#0A1929] border border-[#1D9BF0]/30 flex items-center gap-2.5">
        <span className="w-2 h-2 rounded-full bg-[#1D9BF0] pulse-dot shrink-0" />
        <div className="min-w-0">
          <div className="text-[#1D9BF0] text-[10px] font-bold tracking-widest uppercase">Modelo activo</div>
          <div className="text-[#71767B] text-[11px] truncate mt-0.5">mango-v2.0 · 8M params</div>
        </div>
      </div>

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {NAV.map(({ to, icon: Icon, label, badge }) => {
          const active = pathname.startsWith(to)
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 ${
                active
                  ? 'bg-[#1D9BF0]/10 text-[#1D9BF0]'
                  : 'text-[#71767B] hover:text-[#E7E9EA] hover:bg-[#16181C]'
              }`}
            >
              <Icon size={17} className="shrink-0" />
              <span className="flex-1">{label}</span>
              {badge && (
                <span className="bg-[#1D9BF0] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {badge}
                </span>
              )}
            </Link>
          )
        })}

        <div className="my-3 border-t border-[#2F3336]" />

        {/* Mango Tycoon */}
        <Link
          to="/app/mango"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 ${
            inMango
              ? 'bg-[#F59E0B]/10 text-[#FBBF24] border border-[#F59E0B]/20'
              : 'text-[#71767B] hover:text-[#FBBF24] hover:bg-[#16181C]'
          }`}
        >
          <span className="text-base leading-none shrink-0">🥭</span>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold leading-tight">Mango Tycoon</div>
            <div className="text-[11px] text-[#71767B] leading-tight mt-0.5">Aprendé jugando</div>
          </div>
        </Link>
      </nav>

      {/* ── Bottom ───────────────────────────────────────────────────────── */}
      <div className="px-3 pb-5 pt-3 border-t border-[#2F3336] space-y-0.5">
        <Link
          to="/app/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-[#71767B] hover:text-[#E7E9EA] hover:bg-[#16181C] transition-all duration-150"
        >
          <Settings size={17} className="shrink-0" />
          Configuración
        </Link>
        <Link
          to="/login"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-[#71767B] hover:text-[#F4212E] hover:bg-[#200006]/40 transition-all duration-150"
        >
          <LogOut size={17} className="shrink-0" />
          Cerrar sesión
        </Link>
      </div>
    </aside>
  )
}
