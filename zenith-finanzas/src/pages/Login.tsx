import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight, Zap } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await new Promise(r => setTimeout(r, 700))
    setLoading(false)
    navigate('/app/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#030712] flex flex-col items-center justify-center px-4 neural-bg">
      {/* Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 bg-[#10b981]/6 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#10b981] to-[#6366f1] flex items-center justify-center">
            <span className="text-white text-sm font-black">Z</span>
          </div>
          <div>
            <div className="text-white font-bold tracking-wide">ZENITH</div>
            <div className="text-[#10b981] text-[10px] tracking-[0.15em] font-medium -mt-0.5">FINANZAS</div>
          </div>
        </div>

        {/* Card */}
        <div className="bg-[#0c1221] border border-[#1e293b] rounded-2xl p-7">
          <h1 className="text-[#f8fafc] font-bold text-xl mb-1">Bienvenido de vuelta</h1>
          <p className="text-[#64748b] text-sm mb-6">Ingresá para ver tus señales y portfolio</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-[#64748b] mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="usuario@email.com"
                className="w-full bg-[#0f172a] border border-[#1e293b] rounded-xl px-4 py-2.5 text-sm text-[#f8fafc] placeholder-[#334155] focus:outline-none focus:border-[#10b981]/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-[#64748b] mb-1.5">Contraseña</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full bg-[#0f172a] border border-[#1e293b] rounded-xl px-4 py-2.5 pr-10 text-sm text-[#f8fafc] placeholder-[#334155] focus:outline-none focus:border-[#10b981]/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-[#f8fafc] transition-colors"
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#10b981] hover:bg-[#059669] disabled:opacity-60 text-black font-bold py-2.5 rounded-xl transition-colors text-sm mt-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <>Ingresar <ArrowRight size={14} /></>
              )}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-[#1e293b] space-y-3">
            <button
              onClick={() => navigate('/app/dashboard')}
              className="w-full flex items-center justify-center gap-2 border border-[#1e293b] hover:border-[#334155] text-[#64748b] hover:text-[#f8fafc] py-2.5 rounded-xl transition-colors text-sm"
            >
              <Zap size={14} className="text-[#6366f1]" />
              Entrar sin cuenta (demo)
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-[#64748b] mt-4">
          ¿No tenés cuenta?{' '}
          <Link to="/app/dashboard" className="text-[#10b981] hover:text-[#059669]">
            Creá una gratis
          </Link>
        </p>

        <p className="text-center text-[10px] text-[#334155] mt-3">
          Las señales son informativas. No constituyen asesoría financiera.
        </p>
      </div>
    </div>
  )
}
