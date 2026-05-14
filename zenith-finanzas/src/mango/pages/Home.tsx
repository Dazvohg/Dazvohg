import { Link } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import { useRef, useEffect, useState } from 'react'
import { useAuthStore } from '../game/store/authStore'

// ─── Animated counter ────────────────────────────────────────────────────────
function Counter({ to, suffix = '', prefix = '' }: { to: number; suffix?: string; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const [val, setVal] = useState(0)

  useEffect(() => {
    if (!inView) return
    const start = Date.now()
    const dur = 1400
    const frame = () => {
      const p = Math.min((Date.now() - start) / dur, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(ease * to))
      if (p < 1) requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  }, [inView, to])

  return <span ref={ref}>{prefix}{val.toLocaleString('es-AR')}{suffix}</span>
}

// ─── Floating particle ────────────────────────────────────────────────────────
function FloatingEmoji({ emoji, x, y, delay, size }: {
  emoji: string; x: number; y: number; delay: number; size: number
}) {
  return (
    <motion.div
      className="absolute select-none pointer-events-none"
      style={{ left: `${x}%`, top: `${y}%`, fontSize: size }}
      animate={{ y: [-10, 10, -10], rotate: [-5, 5, -5], opacity: [0.15, 0.35, 0.15] }}
      transition={{ duration: 4 + delay, repeat: Infinity, ease: 'easeInOut', delay }}
    >
      {emoji}
    </motion.div>
  )
}

const PARTICLES = [
  { emoji: '🥭', x: 5,  y: 10, delay: 0,   size: 40 },
  { emoji: '💰', x: 90, y: 15, delay: 1.2, size: 30 },
  { emoji: '📈', x: 15, y: 70, delay: 0.5, size: 28 },
  { emoji: '🏢', x: 82, y: 60, delay: 2,   size: 32 },
  { emoji: '🥭', x: 50, y: 5,  delay: 1.8, size: 24 },
  { emoji: '⚽', x: 30, y: 85, delay: 0.8, size: 26 },
  { emoji: '🏠', x: 70, y: 80, delay: 2.4, size: 28 },
  { emoji: '📜', x: 8,  y: 45, delay: 1.5, size: 22 },
  { emoji: '🌿', x: 92, y: 40, delay: 0.3, size: 26 },
  { emoji: '⚡', x: 55, y: 90, delay: 1.1, size: 24 },
]

// ─── Asset ticker ─────────────────────────────────────────────────────────────
const TICKER_ASSETS = [
  { icon: '🏢', name: 'Tecno Corp', price: '4,200', yield: '+1.2%', up: true },
  { icon: '🏠', name: 'Depto Palermo', price: '18,500', yield: '+0.8%', up: true },
  { icon: '⚽', name: 'Club Atlético La Boca', price: '8,900', yield: '+1.5%', up: true },
  { icon: '📜', name: 'AL30', price: '3,200', yield: '+2.1%', up: true },
  { icon: '🛢️', name: 'EnergySur', price: '12,400', yield: '+0.9%', up: false },
  { icon: '🏔️', name: 'Hotel Bariloche', price: '6,800', yield: '+1.8%', up: true },
  { icon: '🍷', name: 'Viñedo Mendoza', price: '5,100', yield: '+1.1%', up: true },
  { icon: '🌿', name: 'Soja Pampa', price: '2,800', yield: '+1.3%', up: true },
  { icon: '⚡', name: 'Solar San Juan', price: '9,600', yield: '+1.4%', up: true },
  { icon: '🐄', name: 'Feedlot Pampas', price: '3,900', yield: '+1.0%', up: false },
]

const FEATURES = [
  {
    icon: '🛒',
    title: '50+ Activos Argentinos',
    desc: 'Empresas, bonos, inmuebles, clubes, agro, energía y turismo de las 8 regiones del país.',
    color: 'from-mango-900/40 to-gray-900',
    border: 'border-mango-700/40',
    accent: 'text-mango-400',
  },
  {
    icon: '🗺️',
    title: 'Mapa Interactivo',
    desc: 'Explorá las 8 regiones de Argentina y sus activos únicos. Desde CABA hasta la Patagonia.',
    color: 'from-argentina-blue/10 to-gray-900',
    border: 'border-argentina-blue/30',
    accent: 'text-argentina-blue',
  },
  {
    icon: '🏢',
    title: 'Fundá tu Empresa',
    desc: 'Creá tu propia bodega, tech startup, hotel o exportadora. Invertí capital y cobrá renta diaria.',
    color: 'from-purple-900/30 to-gray-900',
    border: 'border-purple-700/40',
    accent: 'text-purple-400',
  },
  {
    icon: '📊',
    title: 'Economía Real',
    desc: 'El dólar blue, la inflación y los eventos (cepo, boom Vaca Muerta, FMI) afectan tus precios.',
    color: 'from-red-900/20 to-gray-900',
    border: 'border-red-700/30',
    accent: 'text-red-400',
  },
  {
    icon: '🏅',
    title: 'Sistema de Reputación',
    desc: '6 sectores (financiero, inmobiliario, deportivo, agro, energía, turismo). Más reputación = activos premium.',
    color: 'from-yellow-900/20 to-gray-900',
    border: 'border-yellow-700/30',
    accent: 'text-yellow-400',
  },
  {
    icon: '🎓',
    title: 'Academia Financiera',
    desc: 'Aprendé finanzas reales jugando. Cada lección completada te da 650 Mango Coins de recompensa.',
    color: 'from-green-900/20 to-gray-900',
    border: 'border-green-700/30',
    accent: 'text-green-400',
  },
]

const EVENTS = [
  { icon: '⚡', title: 'Boom de Vaca Muerta', desc: 'El sector energético sube +20%', type: 'boom' },
  { icon: '📉', title: 'Turbulencia Financiera', desc: 'Riesgo país supera 1.500 pb', type: 'crisis' },
  { icon: '🤝', title: 'Acuerdo con el FMI', desc: 'Bonos suben +30%, blue baja', type: 'boom' },
  { icon: '🔒', title: 'Endurecimiento del Cepo', desc: 'Blue escapa, +25% en el día', type: 'cepo' },
]

const REGIONS = [
  { name: 'CABA & GBA', icon: '🏙️', assets: 18, highlight: 'text-blue-400', border: 'border-blue-700/40' },
  { name: 'Patagonia', icon: '🏔️', assets: 5, highlight: 'text-cyan-400', border: 'border-cyan-700/40' },
  { name: 'Mendoza & Cuyo', icon: '🍷', assets: 4, highlight: 'text-red-400', border: 'border-red-700/40' },
  { name: 'Santa Fe', icon: '🌿', assets: 2, highlight: 'text-green-400', border: 'border-green-700/40' },
  { name: 'Córdoba', icon: '🏔️', assets: 3, highlight: 'text-purple-400', border: 'border-purple-700/40' },
  { name: 'NOA', icon: '🏜️', assets: 1, highlight: 'text-yellow-400', border: 'border-yellow-700/40' },
]

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.1 } } },
  item: {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 22 } },
  },
}

export default function Home() {
  const { user } = useAuthStore()

  return (
    <div className="min-h-screen bg-gray-950 overflow-x-hidden">

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-16 pb-12 overflow-hidden">
        {/* Radial glow background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-mango-500/8 rounded-full blur-[100px]" />
          <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-argentina-blue/6 rounded-full blur-[80px]" />
        </div>

        {/* Floating particles */}
        {PARTICLES.map((p, i) => <FloatingEmoji key={i} {...p} />)}

        {/* Hero content */}
        <div className="relative z-10 text-center max-w-sm w-full">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 bg-mango-500/10 border border-mango-500/30 rounded-full px-4 py-1.5 text-xs font-semibold text-mango-400 mb-6"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-mango-400 animate-pulse" />
            100% ficticio · Sin dinero real
          </motion.div>

          {/* Main mango */}
          <motion.div
            animate={{ y: [0, -12, 0], rotate: [-2, 2, -2] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            className="text-9xl mb-4 select-none"
            style={{ filter: 'drop-shadow(0 0 40px rgba(245,158,11,0.4))' }}
          >
            🥭
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 150 }}
            className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-mango-300 to-mango-600 mb-3 leading-none"
          >
            MANGO<br />TYCOON
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-gray-300 text-xl font-semibold mb-2"
          >
            Invertí en Argentina.
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-gray-500 text-base mb-10"
          >
            Aprendé finanzas reales jugando.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85 }}
            className="flex flex-col gap-3"
          >
            {user ? (
              <Link
                to="/app/mango/game"
                className="btn-primary py-4 text-lg font-black rounded-2xl shadow-lg shadow-mango-500/20 text-center"
              >
                🎮 Seguir jugando
              </Link>
            ) : (
              <>
                <Link
                  to="/app/mango/login"
                  className="btn-primary py-4 text-lg font-black rounded-2xl shadow-lg shadow-mango-500/20 text-center"
                >
                  🚀 Empezar a invertir
                </Link>
                <Link
                  to="/login?mode=login"
                  className="btn-secondary py-3 text-base rounded-2xl text-center"
                >
                  Ya tengo cuenta →
                </Link>
              </>
            )}
          </motion.div>

          {/* Scroll hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="mt-12"
          >
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-gray-600 text-xs flex flex-col items-center gap-1"
            >
              <span>Descubrí todo</span>
              <span className="text-lg">↓</span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── ASSET TICKER ──────────────────────────────────────────────────── */}
      <div className="bg-gray-900/60 border-y border-gray-800 py-3 overflow-hidden">
        <motion.div
          className="flex gap-0"
          animate={{ x: [0, -50 * TICKER_ASSETS.length * 2] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          style={{ width: 'max-content' }}
        >
          {[...TICKER_ASSETS, ...TICKER_ASSETS].map((a, i) => (
            <div key={i} className="flex items-center gap-2 px-5 border-r border-gray-800 whitespace-nowrap">
              <span className="text-base">{a.icon}</span>
              <span className="text-xs font-semibold text-gray-300">{a.name}</span>
              <span className="text-xs font-mono text-mango-400">${a.price} MC</span>
              <span className={`text-xs font-bold ${a.up ? 'text-green-400' : 'text-red-400'}`}>{a.yield}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── STATS ─────────────────────────────────────────────────────────── */}
      <section className="px-4 py-14">
        <motion.div
          variants={stagger.container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-2 gap-4 max-w-sm mx-auto"
        >
          {[
            { label: 'Jugadores activos', val: 3218, suffix: '+', color: 'text-mango-400' },
            { label: 'Activos en el mercado', val: 52, color: 'text-argentina-blue' },
            { label: 'Regiones de Argentina', val: 8, color: 'text-green-400' },
            { label: 'MC en circulación', val: 1200000, prefix: '$', color: 'text-purple-400' },
          ].map((s) => (
            <motion.div
              key={s.label}
              variants={stagger.item}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-center"
            >
              <p className={`text-3xl font-black tabular-nums ${s.color}`}>
                <Counter to={s.val} suffix={s.suffix} prefix={s.prefix} />
              </p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────────────────── */}
      <section className="px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl font-black text-white mb-2">¿Qué vas a encontrar?</h2>
          <p className="text-gray-500 text-sm">Todo lo que tiene el juego, explicado en 30 segundos</p>
        </motion.div>

        <motion.div
          variants={stagger.container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="space-y-3 max-w-sm mx-auto"
        >
          {FEATURES.map((f) => (
            <motion.div
              key={f.title}
              variants={stagger.item}
              whileHover={{ scale: 1.02, x: 4 }}
              className={`bg-gradient-to-r ${f.color} border ${f.border} rounded-2xl p-5 flex gap-4 items-start`}
            >
              <span className="text-3xl shrink-0 mt-0.5">{f.icon}</span>
              <div>
                <p className={`font-bold text-sm ${f.accent}`}>{f.title}</p>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── HOW TO PLAY ───────────────────────────────────────────────────── */}
      <section className="px-4 py-14 bg-gray-900/40">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl font-black text-white mb-2">Cómo se juega</h2>
          <p className="text-gray-500 text-sm">En 3 pasos tenés tu primer activo rentando</p>
        </motion.div>

        <motion.div
          variants={stagger.container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="space-y-4 max-w-sm mx-auto"
        >
          {[
            {
              step: '1',
              icon: '👤',
              title: 'Registrate gratis',
              desc: 'Creá tu cuenta con email. Recibís $10,000 MC de bienvenida para empezar.',
              color: 'border-mango-700/50 bg-mango-900/20',
            },
            {
              step: '2',
              icon: '🛒',
              title: 'Comprá tu primer activo',
              desc: 'Entrá al Mercado, elegí un activo y hacé click en Comprar. Ya sos inversor.',
              color: 'border-argentina-blue/40 bg-argentina-blue/5',
            },
            {
              step: '3',
              icon: '💰',
              title: 'Cobrá renta pasiva',
              desc: 'Tus activos generan MC automáticamente cada día. Cada vez que volvés, cobrás.',
              color: 'border-green-700/40 bg-green-900/20',
            },
            {
              step: '4',
              icon: '🏆',
              title: 'Subí en el ranking',
              desc: 'Más patrimonio = más nivel = activos premium desbloqueados. Competí globalmente.',
              color: 'border-purple-700/40 bg-purple-900/20',
            },
          ].map((s) => (
            <motion.div
              key={s.step}
              variants={stagger.item}
              className={`border ${s.color} rounded-2xl p-5 flex gap-4 items-start`}
            >
              <div className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center shrink-0 font-black text-mango-400 text-sm">
                {s.step}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{s.icon}</span>
                  <p className="font-bold text-sm text-white">{s.title}</p>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">{s.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── ECONOMY EVENTS ────────────────────────────────────────────────── */}
      <section className="px-4 py-14">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl font-black text-white mb-2">Eventos Económicos</h2>
          <p className="text-gray-500 text-sm">La Argentina nunca aburre. El juego tampoco.</p>
        </motion.div>

        <motion.div
          variants={stagger.container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-2 gap-3 max-w-sm mx-auto"
        >
          {EVENTS.map((e) => (
            <motion.div
              key={e.title}
              variants={stagger.item}
              whileHover={{ scale: 1.04 }}
              className={`rounded-2xl p-4 border text-center ${
                e.type === 'boom'
                  ? 'bg-green-900/20 border-green-700/40'
                  : e.type === 'cepo'
                  ? 'bg-yellow-900/20 border-yellow-700/40'
                  : 'bg-red-900/20 border-red-700/40'
              }`}
            >
              <div className="text-3xl mb-2">{e.icon}</div>
              <p className="text-xs font-bold text-white mb-1">{e.title}</p>
              <p className="text-xs text-gray-500">{e.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── REGIONS ───────────────────────────────────────────────────────── */}
      <section className="px-4 py-14 bg-gray-900/40">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl font-black text-white mb-2">8 Regiones de Argentina</h2>
          <p className="text-gray-500 text-sm">Cada región tiene activos únicos, estacionalidad y bonos</p>
        </motion.div>

        <motion.div
          variants={stagger.container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-2 gap-3 max-w-sm mx-auto"
        >
          {REGIONS.map((r) => (
            <motion.div
              key={r.name}
              variants={stagger.item}
              whileHover={{ scale: 1.04 }}
              className={`bg-gray-900 border ${r.border} rounded-2xl p-4 text-center`}
            >
              <div className="text-3xl mb-2">{r.icon}</div>
              <p className={`text-xs font-bold ${r.highlight}`}>{r.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{r.assets} activos</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── ACADEMIA PROMO ────────────────────────────────────────────────── */}
      <section className="px-4 py-14">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-sm mx-auto bg-gradient-to-br from-green-900/30 to-gray-900 border border-green-700/40 rounded-3xl p-8 text-center"
        >
          <div className="text-6xl mb-4">🎓</div>
          <h3 className="text-2xl font-black text-white mb-2">Academia Financiera</h3>
          <p className="text-gray-400 text-sm mb-4 leading-relaxed">
            Aprendé finanzas reales mientras jugás. Presupuesto, deuda, ahorro, CEDEARs, MERVAL.
            <strong className="text-green-400"> Cada lección = 650 MC de recompensa.</strong>
          </p>
          <div className="grid grid-cols-3 gap-2 mb-6">
            {['📊 Presupuesto', '💳 Deudas', '🛡️ Ahorro', '💵 Dólar', '📈 MERVAL', '🌎 CEDEARs'].map((l) => (
              <div key={l} className="bg-gray-800/60 rounded-xl py-2 px-1 text-xs text-gray-300 text-center">
                {l}
              </div>
            ))}
          </div>
          {user ? (
            <Link to="/app/mango/game/academia" className="btn-primary w-full text-sm rounded-xl py-3 block text-center">
              📚 Ir a la Academia
            </Link>
          ) : (
            <Link to="/app/mango/login" className="btn-primary w-full text-sm rounded-xl py-3 block text-center">
              🚀 Empezar a aprender
            </Link>
          )}
        </motion.div>
      </section>

      {/* ── MANGO ECOSYSTEM ──────────────────────────────────────────────── */}
      <section className="px-4 py-14 border-t border-gray-800">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-sm mx-auto"
        >
          <div className="text-center mb-6">
            <span className="inline-flex items-center gap-2 text-xs text-gray-500 bg-gray-900 border border-gray-700 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Ecosistema Mango
            </span>
          </div>
          <a
            href={import.meta.env.VITE_MANGO_URL ?? 'http://localhost:5174'}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-gradient-to-br from-gray-900 to-gray-950 border border-indigo-700/30 rounded-3xl p-7 hover:border-indigo-500/50 transition-colors group"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#10b981] to-[#6366f1] flex items-center justify-center shrink-0 shadow-lg shadow-indigo-900/40">
                <span className="text-white text-lg font-black">Z</span>
              </div>
              <div>
                <div className="text-white font-black text-base group-hover:text-[#10b981] transition-colors">MANGO</div>
                <div className="text-[10px] text-[#10b981] tracking-widest font-semibold">ANÁLISIS PRO CON IA →</div>
              </div>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-5">
              La herramienta profesional del ecosistema. Deep Learning sobre MERVAL, ADRs y bonos argentinos con estimación de incertidumbre por señal.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: '🤖', label: 'Señales IA', sub: '67.3% win rate' },
                { icon: '📡', label: 'Terminal', sub: 'Tiempo real' },
                { icon: '📊', label: 'Simulador', sub: '13 instrumentos' },
                { icon: '🎓', label: 'Academia', sub: 'Mismas lecciones' },
              ].map((item) => (
                <div key={item.label} className="bg-gray-800/50 rounded-xl p-3 flex items-center gap-2.5">
                  <span className="text-lg shrink-0">{item.icon}</span>
                  <div>
                    <div className="text-xs font-semibold text-gray-200">{item.label}</div>
                    <div className="text-[10px] text-gray-500">{item.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </a>
        </motion.div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────────────── */}
      <section className="px-4 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-sm mx-auto"
        >
          <motion.div
            animate={{ scale: [1, 1.05, 1], rotate: [-3, 3, -3] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="text-7xl mb-6"
          >
            🥭
          </motion.div>
          <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-mango-300 to-mango-600 mb-3">
            ¿Listo para invertir?
          </h2>
          <p className="text-gray-400 text-sm mb-8 leading-relaxed">
            Más de 3,000 jugadores ya están construyendo su patrimonio virtual.<br />
            Es gratis, es argentino, y te va a enseñar más de lo que esperás.
          </p>
          {user ? (
            <Link to="/app/mango/game" className="btn-primary py-4 text-xl font-black rounded-2xl block text-center shadow-xl shadow-mango-500/25">
              🎮 Entrar al juego
            </Link>
          ) : (
            <Link to="/app/mango/login" className="btn-primary py-4 text-xl font-black rounded-2xl block text-center shadow-xl shadow-mango-500/25">
              🚀 Empezar gratis
            </Link>
          )}
          <p className="text-xs text-gray-600 mt-4">Sin tarjeta · Sin dinero real · Solo diversión</p>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 text-center text-xs text-gray-600 px-4">
        <p className="mb-1">🥭 Mango Tycoon — 100% ficticio, precios simulados</p>
        <p>Parte del ecosistema <span className="text-mango-400 font-semibold">Mango</span></p>
      </footer>

    </div>
  )
}
