import { ExternalLink, GraduationCap, GamepadIcon, BookOpen, Trophy } from 'lucide-react'

const MODULES = [
  {
    title: 'Mango Tycoon',
    desc: 'Simulador de inversiones argentinas gamificado. Comprá activos, gestioná tu portfolio y aprendé economía jugando.',
    icon: GamepadIcon,
    color: '#10b981',
    badge: 'Game',
    href: '/',
    cta: 'Jugar ahora',
  },
  {
    title: 'Conceptos de Trading',
    desc: 'Aprende los fundamentos: tipos de órdenes, gestión de riesgo, position sizing y psicología del trader.',
    icon: BookOpen,
    color: '#6366f1',
    badge: 'Teoría',
    href: '#',
    cta: 'Próximamente',
    disabled: true,
  },
  {
    title: 'Deep Learning para Finanzas',
    desc: 'Cómo funciona Zenith v2: Transformers, atención multi-cabeza, FiLM conditioning y estimación de incertidumbre.',
    icon: GraduationCap,
    color: '#0ea5e9',
    badge: 'Avanzado',
    href: '#',
    cta: 'Próximamente',
    disabled: true,
  },
  {
    title: 'Mercados Argentinos 101',
    desc: 'MERVAL, ADRs, bonos soberanos, contado con liquidación. Todo lo que necesitás saber para operar desde Argentina.',
    icon: Trophy,
    color: '#f59e0b',
    badge: 'Local',
    href: '#',
    cta: 'Próximamente',
    disabled: true,
  },
]

export default function Academia() {
  return (
    <div className="p-6 space-y-6">
      <div className="px-0 py-0">
        <h1 className="text-[#f8fafc] font-semibold text-base">Academia Zenith</h1>
        <p className="text-[#64748b] text-xs mt-0.5">Formación financiera y simuladores de práctica</p>
      </div>

      <div className="bg-gradient-to-r from-[#064e3b]/30 to-[#1e1b4b]/30 border border-[#10b981]/20 rounded-2xl p-6 flex gap-5 items-center">
        <div className="w-14 h-14 rounded-2xl bg-[#10b981]/20 border border-[#10b981]/30 flex items-center justify-center shrink-0 text-2xl">
          🥭
        </div>
        <div>
          <div className="text-[#f8fafc] font-bold text-lg mb-1">Mango Tycoon — El juego financiero argentino</div>
          <p className="text-[#94a3b8] text-sm max-w-xl">
            Invertí en empresas, inmuebles, bonos, energía y turismo argentino. Manejá tu reputación
            por sector, fundá tu propia empresa y competí en el ranking global.
          </p>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-3 text-sm font-semibold text-[#10b981] hover:text-[#059669] transition-colors"
          >
            Abrir Mango Tycoon <ExternalLink size={14} />
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MODULES.map(m => {
          const Icon = m.icon
          return (
            <div
              key={m.title}
              className={`bg-[#111827] border rounded-xl p-5 transition-colors ${
                m.disabled ? 'border-[#1e293b] opacity-60' : 'border-[#1e293b] hover:border-[#334155]'
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${m.color}15`, border: `1px solid ${m.color}25` }}
                >
                  <Icon size={18} style={{ color: m.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[#f8fafc] font-semibold text-sm">{m.title}</span>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                      style={{ color: m.color, background: `${m.color}15` }}
                    >
                      {m.badge}
                    </span>
                  </div>
                  <p className="text-[#64748b] text-xs leading-relaxed mb-3">{m.desc}</p>
                  {m.disabled ? (
                    <span className="text-xs text-[#334155]">{m.cta}</span>
                  ) : (
                    <a
                      href={m.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold transition-colors"
                      style={{ color: m.color }}
                    >
                      {m.cta} <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Zenith model summary */}
      <div className="bg-[#0c1221] border border-[#1e293b] rounded-xl p-6">
        <div className="text-[#f8fafc] font-bold mb-3">Zenith v2.0 — Resumen de Arquitectura</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-4">
          {[
            { label: 'Parámetros',   value: '8M+' },
            { label: 'Features',     value: '70+' },
            { label: 'Capas',        value: '35+' },
            { label: 'Regímenes',    value: '6' },
            { label: 'Timeframes',   value: '3 (5s/15s/60s)' },
            { label: 'Símbolos',     value: '20 simultáneos' },
            { label: 'Buffer size',  value: '100K samples' },
            { label: 'Train cada',   value: '500 steps' },
          ].map(s => (
            <div key={s.label} className="bg-[#111827] rounded-lg p-3">
              <div className="text-[#64748b] mb-0.5">{s.label}</div>
              <div className="font-mono text-[#f8fafc] font-bold">{s.value}</div>
            </div>
          ))}
        </div>
        <p className="text-[#64748b] text-xs leading-relaxed">
          Pipeline: Input Embeddings → Dual-Stream Encoder (Transformer price + CNN volume) →
          Transformer Stack (4L, 8H) → Regime Conditioning FiLM → Attention Pooling →
          Multi-Task Heads (probability + PnL + volatility) con Kendall uncertainty weighting.
          Prioritized replay buffer con recency decay y curriculum learning en 3 etapas.
        </p>
      </div>
    </div>
  )
}
