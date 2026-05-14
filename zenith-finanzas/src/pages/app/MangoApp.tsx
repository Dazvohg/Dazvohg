import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/mango/game/store/authStore'
import ProtectedRoute from '@/mango/components/ProtectedRoute'
import MangoHome from '@/mango/pages/Home'
import MangoLogin from '@/mango/pages/Login'
import Game from '@/mango/pages/game/Game'
import GameDashboard from '@/mango/pages/game/Dashboard'
import Market from '@/mango/pages/game/Market'
import Portfolio from '@/mango/pages/game/Portfolio'
import Objectives from '@/mango/pages/game/Objectives'
import Leaderboard from '@/mango/pages/game/Leaderboard'
import Map from '@/mango/pages/game/Map'
import Company from '@/mango/pages/game/Company'
import Academia from '@/mango/pages/game/Academia'

export default function MangoApp() {
  const { initialize } = useAuthStore()
  useEffect(() => { initialize() }, [initialize])

  return (
    <Routes>
      <Route index element={<MangoHome />} />
      <Route path="login" element={<MangoLogin />} />
      <Route
        path="game"
        element={<ProtectedRoute><Game /></ProtectedRoute>}
      >
        <Route index element={<GameDashboard />} />
        <Route path="market"      element={<Market />} />
        <Route path="portfolio"   element={<Portfolio />} />
        <Route path="objectives"  element={<Objectives />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="mapa"        element={<Map />} />
        <Route path="empresa"     element={<Company />} />
        <Route path="academia"    element={<Academia />} />
      </Route>
      <Route path="*" element={<Navigate to="/app/mango" replace />} />
    </Routes>
  )
}
