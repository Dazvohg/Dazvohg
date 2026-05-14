import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import MarketTicker from '@/components/MarketTicker'
import ChatModal from '@/components/ChatModal'

export default function AppLayout() {
  const [chatOpen, setChatOpen] = useState(false)

  return (
    <div className="flex h-screen bg-[#030712] overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <MarketTicker />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Floating chat button */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-gradient-to-br from-[#10b981] to-[#6366f1] flex items-center justify-center shadow-lg hover:scale-105 transition-transform z-40"
          title="Mango AI Chat"
        >
          <MessageCircle size={20} className="text-white" />
        </button>
      )}

      {chatOpen && <ChatModal onClose={() => setChatOpen(false)} />}
    </div>
  )
}
