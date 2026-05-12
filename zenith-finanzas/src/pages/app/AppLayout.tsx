import { Outlet } from 'react-router-dom'
import Sidebar from '@/components/Sidebar'
import MarketTicker from '@/components/MarketTicker'

export default function AppLayout() {
  return (
    <div className="flex h-screen bg-[#030712] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <MarketTicker />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
