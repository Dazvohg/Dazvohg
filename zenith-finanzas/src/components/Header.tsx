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
    <header className="h-14 px-6 bg-black/80 backdrop-blur-md border-b border-[#2F3336] flex items-center justify-between shrink-0 sticky top-0 z-20">
      <div>
        <h1 className="text-[#E7E9EA] font-bold text-base leading-tight">{title}</h1>
        {subtitle && <p className="text-[#71767B] text-xs capitalize mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden md:flex flex-col items-end mr-2">
          <span className="text-[#E7E9EA] text-xs font-mono">{time}</span>
          <span className="text-[#71767B] text-[10px] capitalize">{date}</span>
        </div>

        <button className="w-8 h-8 rounded-full bg-[#16181C] border border-[#2F3336] flex items-center justify-center text-[#71767B] hover:text-[#E7E9EA] hover:border-[#3E4144] transition-all">
          <Search size={14} />
        </button>

        <button className="relative w-8 h-8 rounded-full bg-[#16181C] border border-[#2F3336] flex items-center justify-center text-[#71767B] hover:text-[#E7E9EA] hover:border-[#3E4144] transition-all">
          <Bell size={14} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#1D9BF0] ring-1 ring-black" />
        </button>

        <div className="w-8 h-8 rounded-full bg-[#1D9BF0] flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-[#1D9BF0]/25">
          M
        </div>
      </div>
    </header>
  )
}
