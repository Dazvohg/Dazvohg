import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../game/store/authStore'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-mango-400 text-lg animate-pulse">Cargando Mango Tycoon…</p>
      </div>
    )
  }

  return user ? <>{children}</> : <Navigate to="/app/mango/login" replace />
}
