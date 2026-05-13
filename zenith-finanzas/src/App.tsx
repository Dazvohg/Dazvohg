import { HashRouter as BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from '@/pages/Landing'
import Login from '@/pages/Login'
import AppLayout from '@/pages/app/AppLayout'
import Dashboard from '@/pages/app/Dashboard'
import Terminal from '@/pages/app/Terminal'
import Signals from '@/pages/app/Signals'
import Portfolio from '@/pages/app/Portfolio'
import Finanzas from '@/pages/app/Finanzas'
import Simulador from '@/pages/app/Simulador'
import Academia from '@/pages/app/Academia'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard"  element={<Dashboard />} />
          <Route path="terminal"   element={<Terminal />} />
          <Route path="signals"    element={<Signals />} />
          <Route path="portfolio"  element={<Portfolio />} />
          <Route path="finanzas"   element={<Finanzas />} />
          <Route path="simulador"  element={<Simulador />} />
          <Route path="academia"   element={<Academia />} />
          <Route path="*"          element={<Navigate to="/app/dashboard" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
