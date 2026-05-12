import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from './game/store/authStore'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Login from './pages/Login'
import Game from './pages/game/Game'
import Dashboard from './pages/game/Dashboard'
import Market from './pages/game/Market'
import Portfolio from './pages/game/Portfolio'
import Objectives from './pages/game/Objectives'
import Leaderboard from './pages/game/Leaderboard'
import Map from './pages/game/Map'
import Company from './pages/game/Company'

export default function App() {
  const { initialize } = useAuthStore()
  useEffect(() => { initialize() }, [initialize])

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/game"
        element={<ProtectedRoute><Game /></ProtectedRoute>}
      >
        <Route index element={<Dashboard />} />
        <Route path="market"      element={<Market />} />
        <Route path="portfolio"   element={<Portfolio />} />
        <Route path="objectives"  element={<Objectives />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="mapa"        element={<Map />} />
        <Route path="empresa"     element={<Company />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
