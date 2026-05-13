import { Bell, Search } from 'lucide-react'

interface Props {
  title: string
  subtitle?: string
}

export default function Header({ title, subtitle }: Props) {
  const now = new Date()
  const time = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const date = now.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <header className="h-14 px-6 bg-[#0c1221]/80 backdrop-blur border-b border-[#1e293b] flex items-center justify-between shrink-0">
      <div>
        <h1 className="text-[#f8fafc] font-semibold text-base leading-tight">{title}</h1>
        {subtitle && <p className="text-[#64748b] text-xs capitalize">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {/* Time */}
        <div className="hidden md:flex flex-col items-end">
          <span className="text-[#f8fafc] text-xs font-mono">{time}</span>
          <span className="text-[#64748b] text-[10px] capitalize">{date}</span>
        </div>

        {/* Search */}
        <button className="w-8 h-8 rounded-lg bg-[#1e293b] flex items-center justify-center text-[#64748b] hover:text-[#f8fafc] transition-colors">
          <Search size={14} />
        </button>

        {/* Notifications */}
        <button className="relative w-8 h-8 rounded-lg bg-[#1e293b] flex items-center justify-center text-[#64748b] hover:text-[#f8fafc] transition-colors">
          <Bell size={14} />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#10b981]" />
        </button>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#10b981] to-[#6366f1] flex items-center justify-center text-white text-xs font-bold">
          Z
        </div>
      </div>
    </header>
  )
}
