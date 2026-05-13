import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../game/store/authStore'

type Mode = 'login' | 'register'

export default function Login() {
  const [params] = useSearchParams()
  const [mode, setMode] = useState<Mode>(params.get('mode') === 'login' ? 'login' : 'register')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { signIn, signUp, user } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => { if (user) navigate('/game') }, [user, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'register') {
        if (username.trim().length < 3) {
          setError('El nombre de usuario necesita al menos 3 caracteres.')
          return
        }
        await signUp(email, password, username.trim())
      } else {
        await signIn(email, password)
      }
      navigate('/game')
    } catch (e: any) {
      setError(e.message ?? 'Ocurrió un error. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <Link to="/" className="flex justify-center mb-6">
          <span className="text-5xl">🥭</span>
        </Link>

        <h2 className="text-2xl font-bold text-center text-mango-400 mb-1">
          {mode === 'register' ? 'Crear cuenta' : 'Iniciar sesión'}
        </h2>
        <p className="text-center text-gray-500 text-sm mb-6">
          {mode === 'register' ? 'Empezás con 2.500 Mango Cash' : 'Bienvenido de vuelta inversor'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="text-xs text-gray-400 block mb-1">Nombre de usuario</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ej: inversor_boludo"
                autoComplete="username"
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm
                           focus:outline-none focus:border-mango-500 transition-colors"
              />
            </div>
          )}

          <div>
            <label className="text-xs text-gray-400 block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vos@ejemplo.com"
              autoComplete="email"
              required
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm
                         focus:outline-none focus:border-mango-500 transition-colors"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              required
              minLength={6}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm
                         focus:outline-none focus:border-mango-500 transition-colors"
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 text-base">
            {loading ? 'Cargando…' : mode === 'register' ? 'Crear cuenta' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          {mode === 'register' ? '¿Ya tenés cuenta? ' : '¿No tenés cuenta? '}
          <button
            onClick={() => { setMode(mode === 'register' ? 'login' : 'register'); setError('') }}
            className="text-mango-400 hover:text-mango-300 transition-colors font-medium"
          >
            {mode === 'register' ? 'Iniciá sesión' : 'Registrate gratis'}
          </button>
        </p>
      </motion.div>
    </div>
  )
}
