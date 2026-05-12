import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Brain, TrendingUp, Shield, Zap, BarChart2,
  Activity, ArrowRight, ChevronRight, Globe,
} from 'lucide-react'
import { PERFORMANCE } from '@/data/signals'

const FEATURES = [
  {
    icon: Brain,
    title: 'Arquitectura Neuronal Completa',
    desc: 'Transformer encoder multi-head + CNN multi-escala con dilated convolutions. 8M+ parámetros entrenados sobre mercados emergentes.',
    color: '#6366f1',
  },
  {
    icon: Activity,
    title: 'Dual-Stream Price & Volume',
    desc: 'Procesamiento simultáneo de series de precios y volumen con cross-modal attention. Detecta estructura de mercado en 5s, 15s y 60s.',
    color: '#10b981',
  },
  {
    icon: Shield,
    title: 'Uncertainty Estimation',
    desc: 'Cada señal incluye estimación de incertidumbre aleatórica (Kendall et al. 2018). Sabés cuándo el modelo sabe y cuándo no.',
    color: '#0ea5e9',
  },
  {
    icon: BarChart2,
    title: 'Regime-Aware Conditioning',
    desc: 'FiLM conditioning sobre 6 regímenes de mercado: tendencia alcista/bajista, lateral, alta/baja volatilidad y neutro.',
    color: '#f59e0b',
  },
  {
    icon: TrendingUp,
    title: 'Multi-Task Learning',
    desc: 'Predicción simultánea de: probabilidad de ganancia, P&L esperado en bps y volatilidad implícita. Automatic uncertainty weighting.',
    color: '#8b5cf6',
  },
  {
    icon: Globe,
    title: 'Mercados Argentinos',
    desc: 'Optimizado para MERVAL, ADRs argentinos, bonos soberanos y corporativos. Con features cruzados de soja, WTI y DXY.',
    color: '#ef4444',
  },
]

const STATS = [
  { label: 'Win Rate',      value: `${(PERFORMANCE.winRate * 100).toFixed(1)}%`, sub: '4.8K señales' },
  { label: 'Sharpe Ratio',  value: PERFORMANCE.sharpeRatio.toFixed(2),          sub: 'Anualizado' },
  { label: 'Avg P&L',       value: `+${PERFORMANCE.avgPnlBps} bps`,             sub: 'Por señal' },
  { label: 'Max Drawdown',  value: `${PERFORMANCE.maxDrawdownBps} bps`,         sub: 'Histórico' },
]

const STEPS = [
  { n: '01', title: 'Conectá tu broker', desc: 'API key de Interactive Brokers, IOL o PPI. Modo solo-lectura disponible.' },
  { n: '02', title: 'Zenith analiza tu portfolio', desc: 'El modelo audita exposición, correlaciones y riesgo ante cada régimen.' },
  { n: '03', title: 'Recibí señales en tiempo real', desc: 'Notificaciones push con P&L esperado, stop sugerido e incertidumbre.' },
]

const FADE_UP = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.45 } }),
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#030712] text-[#f8fafc] overflow-x-hidden">

      {/* ── Nav ────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#1e293b]/80 bg-[#030712]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#10b981] to-[#6366f1] flex items-center justify-center">
              <span className="text-white text-xs font-black">Z</span>
            </div>
            <span className="text-white font-bold tracking-wide">ZENITH</span>
            <span className="text-[10px] text-[#10b981] tracking-[0.15em] font-medium ml-0.5">FINANZAS</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-[#64748b]">
            <a href="#modelo" className="hover:text-white transition-colors">Modelo</a>
            <a href="#rendimiento" className="hover:text-white transition-colors">Rendimiento</a>
            <a href="#como-funciona" className="hover:text-white transition-colors">Cómo funciona</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-[#64748b] hover:text-white transition-colors px-3 py-1.5">
              Ingresar
            </Link>
            <Link
              to="/app/dashboard"
              className="flex items-center gap-1.5 text-sm bg-[#10b981] hover:bg-[#059669] text-black font-semibold px-4 py-1.5 rounded-lg transition-colors"
            >
              Probar gratis <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────── */}
      <section className="pt-32 pb-20 px-6 relative neural-bg">
        {/* Glow orbs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-[#10b981]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-64 h-64 bg-[#6366f1]/8 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 text-xs text-[#10b981] bg-[#064e3b]/50 border border-[#10b981]/20 px-3 py-1.5 rounded-full mb-6"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] pulse-dot" />
            Modelo activo · zenith-v2.0 · Última señal hace 4 min
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="text-5xl md:text-7xl font-black tracking-tight leading-tight mb-6"
          >
            Deep Learning para<br />
            <span className="bg-gradient-to-r from-[#10b981] via-[#6366f1] to-[#0ea5e9] bg-clip-text text-transparent">
              mercados argentinos
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="text-[#94a3b8] text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Zenith v2 combina Transformers, CNN multi-escala y Regime Conditioning
            para generar señales de alta frecuencia con estimación de incertidumbre
            sobre MERVAL, ADRs y bonos soberanos.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Link
              to="/app/dashboard"
              className="flex items-center gap-2 bg-[#10b981] hover:bg-[#059669] text-black font-bold px-6 py-3 rounded-xl transition-colors text-sm"
            >
              Abrir plataforma <ArrowRight size={16} />
            </Link>
            <a
              href="#modelo"
              className="flex items-center gap-2 text-[#94a3b8] hover:text-white border border-[#1e293b] hover:border-[#334155] px-6 py-3 rounded-xl transition-colors text-sm"
            >
              Ver arquitectura <ChevronRight size={14} />
            </a>
          </motion.div>
        </div>

        {/* Stats strip */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="max-w-3xl mx-auto mt-16 grid grid-cols-2 md:grid-cols-4 gap-px bg-[#1e293b] rounded-2xl overflow-hidden border border-[#1e293b]"
        >
          {STATS.map((s) => (
            <div key={s.label} className="bg-[#0c1221] px-6 py-5 text-center">
              <div className="text-2xl md:text-3xl font-black font-mono text-[#f8fafc] mb-0.5">{s.value}</div>
              <div className="text-xs text-[#10b981] font-medium">{s.label}</div>
              <div className="text-[10px] text-[#64748b]">{s.sub}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── Arquitectura del Modelo ─────────────────── */}
      <section id="modelo" className="py-20 px-6 border-t border-[#1e293b]">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="text-center mb-14"
          >
            <motion.div variants={FADE_UP} custom={0} className="inline-flex items-center gap-2 text-xs text-[#6366f1] bg-[#1e1b4b]/50 border border-[#6366f1]/20 px-3 py-1.5 rounded-full mb-4">
              <Brain size={12} /> Arquitectura Neuronal
            </motion.div>
            <motion.h2 variants={FADE_UP} custom={1} className="text-3xl md:text-4xl font-black mb-4">
              8M+ parámetros, 70+ features, 35+ capas
            </motion.h2>
            <motion.p variants={FADE_UP} custom={2} className="text-[#64748b] max-w-xl mx-auto">
              La arquitectura completa de Zenith v2 procesa simultáneamente
              precio, volumen, microestructura y contexto macroeconómico argentino.
            </motion.p>
          </motion.div>

          {/* Architecture diagram */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="bg-[#0c1221] border border-[#1e293b] rounded-2xl p-6 md:p-8 mb-14 font-mono text-xs overflow-x-auto"
          >
            <div className="min-w-[600px]">
              {/* Pipeline visualization */}
              <div className="flex items-center gap-0 justify-center flex-wrap gap-y-3">
                {[
                  { label: 'Price\nFeatures', color: '#10b981', sub: '15 dim' },
                  { label: 'Volume\nFeatures', color: '#0ea5e9', sub: '10 dim' },
                  { label: 'Microstructure\n+ Indicators', color: '#f59e0b', sub: '37 dim' },
                  { label: 'Context\n+ Cross-Asset', color: '#8b5cf6', sub: '20 dim' },
                ].map((b, i) => (
                  <div key={i} className="flex items-center">
                    <div
                      className="rounded-xl px-4 py-3 text-center border"
                      style={{ background: `${b.color}12`, borderColor: `${b.color}30`, color: b.color }}
                    >
                      <div className="font-bold whitespace-pre-line leading-tight">{b.label}</div>
                      <div className="text-[10px] opacity-60 mt-1">{b.sub}</div>
                    </div>
                    {i < 3 && <div className="w-4 text-[#334155] text-center">→</div>}
                  </div>
                ))}
              </div>

              <div className="flex justify-center my-4 text-[#334155] text-lg">↓</div>

              <div className="flex items-stretch gap-3 justify-center">
                <div className="bg-[#10b981]/10 border border-[#10b981]/20 rounded-xl p-4 text-center flex-1 max-w-[200px]">
                  <div className="text-[#10b981] font-bold mb-1">Dual-Stream Encoder</div>
                  <div className="text-[#64748b] text-[10px]">Transformer + MultiScale CNN</div>
                  <div className="text-[#64748b] text-[10px]">Cross-Modal Attention</div>
                </div>
                <div className="self-center text-[#334155] text-lg">→</div>
                <div className="bg-[#6366f1]/10 border border-[#6366f1]/20 rounded-xl p-4 text-center flex-1 max-w-[200px]">
                  <div className="text-[#6366f1] font-bold mb-1">Transformer Stack</div>
                  <div className="text-[#64748b] text-[10px]">4 layers · 8 heads</div>
                  <div className="text-[#64748b] text-[10px]">Positional Encoding</div>
                </div>
                <div className="self-center text-[#334155] text-lg">→</div>
                <div className="bg-[#f59e0b]/10 border border-[#f59e0b]/20 rounded-xl p-4 text-center flex-1 max-w-[200px]">
                  <div className="text-[#f59e0b] font-bold mb-1">Regime Conditioning</div>
                  <div className="text-[#64748b] text-[10px]">FiLM · 6 regímenes</div>
                  <div className="text-[#64748b] text-[10px]">Attention Pooling</div>
                </div>
              </div>

              <div className="flex justify-center my-4 text-[#334155] text-lg">↓</div>

              <div className="flex items-stretch gap-3 justify-center">
                {[
                  { label: 'Prob. Head', sub: 'P(ganancia)', color: '#10b981' },
                  { label: 'P&L Head', sub: 'bps esperados', color: '#0ea5e9' },
                  { label: 'Vol. Head', sub: 'σ implícita', color: '#8b5cf6' },
                ].map((h) => (
                  <div
                    key={h.label}
                    className="rounded-xl px-5 py-3 text-center border"
                    style={{ background: `${h.color}12`, borderColor: `${h.color}30` }}
                  >
                    <div style={{ color: h.color }} className="font-bold">{h.label}</div>
                    <div className="text-[#64748b] text-[10px] mt-0.5">{h.sub}</div>
                    <div className="text-[#64748b] text-[10px]">+ uncertainty σ</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Feature cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => {
              const Icon = f.icon
              return (
                <motion.div
                  key={f.title}
                  custom={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={FADE_UP}
                  className="bg-[#0c1221] border border-[#1e293b] rounded-xl p-5 hover:border-[#334155] transition-colors"
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                    style={{ background: `${f.color}15`, border: `1px solid ${f.color}25` }}
                  >
                    <Icon size={18} style={{ color: f.color }} />
                  </div>
                  <h3 className="text-[#f8fafc] font-semibold text-sm mb-2">{f.title}</h3>
                  <p className="text-[#64748b] text-xs leading-relaxed">{f.desc}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Rendimiento ────────────────────────────── */}
      <section id="rendimiento" className="py-20 px-6 border-t border-[#1e293b] bg-[#060910]">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="text-center mb-14"
          >
            <motion.div variants={FADE_UP} custom={0} className="inline-flex items-center gap-2 text-xs text-[#10b981] bg-[#064e3b]/50 border border-[#10b981]/20 px-3 py-1.5 rounded-full mb-4">
              <TrendingUp size={12} /> Backtest 2025
            </motion.div>
            <motion.h2 variants={FADE_UP} custom={1} className="text-3xl md:text-4xl font-black mb-4">
              Resultados verificables, señales honestas
            </motion.h2>
            <motion.p variants={FADE_UP} custom={2} className="text-[#64748b] max-w-xl mx-auto">
              El modelo reporta incertidumbre explícita por señal. Cuando Zenith no está seguro, te lo dice.
              El win rate histórico es sobre señales con confianza {'>'} 65%.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Win Rate',       value: '67.3%', sub: '4.812 señales · 2025', accent: '#10b981' },
              { label: 'Sharpe Ratio',   value: '2.84',  sub: 'Anualizado vs MERVAL', accent: '#6366f1' },
              { label: 'P&L Promedio',   value: '+142 bps', sub: 'Por señal cerrada', accent: '#0ea5e9' },
              { label: 'Max Drawdown',   value: '-620 bps', sub: 'Período ago-sep 2025', accent: '#f59e0b' },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={FADE_UP}
                className="bg-[#0c1221] border border-[#1e293b] rounded-xl p-5 text-center"
              >
                <div className="text-3xl font-black font-mono mb-1" style={{ color: s.accent }}>{s.value}</div>
                <div className="text-[#f8fafc] text-sm font-medium mb-1">{s.label}</div>
                <div className="text-[#64748b] text-xs">{s.sub}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cómo funciona ──────────────────────────── */}
      <section id="como-funciona" className="py-20 px-6 border-t border-[#1e293b]">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="text-center mb-14"
          >
            <motion.div variants={FADE_UP} custom={0} className="inline-flex items-center gap-2 text-xs text-[#0ea5e9] bg-[#0c4a6e]/50 border border-[#0ea5e9]/20 px-3 py-1.5 rounded-full mb-4">
              <Zap size={12} /> Comenzar
            </motion.div>
            <motion.h2 variants={FADE_UP} custom={1} className="text-3xl md:text-4xl font-black mb-4">
              Tres pasos para operar con IA
            </motion.h2>
          </motion.div>

          <div className="space-y-4">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.n}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={FADE_UP}
                className="flex gap-5 bg-[#0c1221] border border-[#1e293b] rounded-xl p-5 hover:border-[#334155] transition-colors"
              >
                <div className="text-4xl font-black text-[#1e293b] font-mono shrink-0 w-12">{step.n}</div>
                <div>
                  <h3 className="text-[#f8fafc] font-semibold mb-1">{step.title}</h3>
                  <p className="text-[#64748b] text-sm">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────── */}
      <section className="py-20 px-6 border-t border-[#1e293b]">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-4xl md:text-5xl font-black mb-5">
            Empezá con Zenith<br />
            <span className="bg-gradient-to-r from-[#10b981] to-[#6366f1] bg-clip-text text-transparent">hoy mismo</span>
          </div>
          <p className="text-[#64748b] mb-8">Sin tarjeta de crédito. Modo paper trading ilimitado.</p>
          <Link
            to="/app/dashboard"
            className="inline-flex items-center gap-2 bg-[#10b981] hover:bg-[#059669] text-black font-bold px-8 py-4 rounded-xl transition-colors text-base"
          >
            Abrir plataforma gratuita <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* ── Ecosystem ──────────────────────────────── */}
      <section className="py-20 px-6 border-t border-[#1e293b] bg-[#060910]">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 text-xs text-[#64748b] bg-[#1e293b]/50 border border-[#334155] px-3 py-1.5 rounded-full mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" /> Ecosistema
            </div>
            <h2 className="text-3xl font-black text-[#f8fafc] mb-3">Dos apps. Una misión.</h2>
            <p className="text-[#64748b] max-w-md mx-auto text-sm">
              Zenith Finanzas y Mango Tycoon son parte del mismo ecosistema.
              Aprendé finanzas con análisis de IA profesional y practicá con el juego.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Zenith card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-[#0c1221] border-2 border-[#10b981]/40 rounded-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#10b981] to-[#6366f1] flex items-center justify-center shrink-0">
                  <span className="text-white text-base font-black">Z</span>
                </div>
                <div>
                  <div className="text-[#f8fafc] font-bold text-sm">ZENITH FINANZAS</div>
                  <div className="text-[10px] text-[#10b981] tracking-wide">ANÁLISIS PRO · ESTÁS AQUÍ</div>
                </div>
              </div>
              <p className="text-[#64748b] text-xs leading-relaxed mb-4">
                Deep Learning sobre MERVAL, ADRs y bonos. Señales con estimación de incertidumbre,
                terminal de mercado, simulador de inversiones y Academia financiera.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {['Señales IA', 'Terminal', 'Simulador', 'Academia', 'Portfolio'].map(tag => (
                  <span key={tag} className="text-[10px] bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20 px-2 py-0.5 rounded-full">{tag}</span>
                ))}
              </div>
            </motion.div>

            {/* Mango card */}
            <motion.a
              href={import.meta.env.VITE_MANGO_URL ?? 'http://localhost:5173'}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-[#0c1221] border border-[#d97706]/30 rounded-2xl p-6 hover:border-[#d97706]/60 transition-colors cursor-pointer group block"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#d97706] to-[#f59e0b] flex items-center justify-center shrink-0 text-xl">
                  🥭
                </div>
                <div>
                  <div className="text-[#f8fafc] font-bold text-sm group-hover:text-[#fbbf24] transition-colors">MANGO TYCOON</div>
                  <div className="text-[10px] text-[#d97706] tracking-wide">JUEGO FINANCIERO →</div>
                </div>
              </div>
              <p className="text-[#64748b] text-xs leading-relaxed mb-4">
                Simulador de inversiones en Argentina como juego. Comprá activos reales (empresas,
                bonos, inmuebles), construí tu empresa y aprendé finanzas jugando.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {['50+ Activos', '8 Regiones', 'Empresa propia', 'Ranking', '650 MC/lección'].map(tag => (
                  <span key={tag} className="text-[10px] bg-[#d97706]/10 text-[#d97706] border border-[#d97706]/20 px-2 py-0.5 rounded-full">{tag}</span>
                ))}
              </div>
            </motion.a>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────── */}
      <footer className="border-t border-[#1e293b] py-8 px-6 text-center text-[#64748b] text-xs">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-[#10b981] to-[#6366f1] flex items-center justify-center">
            <span className="text-white text-[10px] font-black">Z</span>
          </div>
          <span className="text-white font-bold text-sm">ZENITH FINANZAS</span>
          <span className="text-[#334155] mx-2">·</span>
          <span className="text-xl">🥭</span>
          <span className="text-[#64748b] font-medium text-sm">Mango Tycoon</span>
        </div>
        <p>Señales generadas por IA con fines informativos. No constituye asesoría financiera.</p>
        <p className="mt-1 text-[#334155]">Rendimientos pasados no garantizan rendimientos futuros.</p>
      </footer>
    </div>
  )
}
