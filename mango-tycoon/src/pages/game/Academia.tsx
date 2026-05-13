import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, Lock, Clock, Star, ChevronRight, X, ArrowLeft, ArrowRight } from 'lucide-react'
import { LESSONS, type Lesson } from '../../data/lessons'
import { useGameStore } from '../../game/store/gameStore'
import S from '../../lib/sound'

const CAT_COLORS: Record<string, string> = {
  presupuesto: '#f59e0b',
  deuda:       '#ef4444',
  ahorro:      '#10b981',
  inversión:   '#6366f1',
  mercados:    '#74ACDF',
}

const DIFF_LABEL: Record<string, string> = {
  básico:     'Básico',
  intermedio: 'Intermedio',
  avanzado:   'Avanzado',
}

const STORAGE_KEY = 'mango_lessons_done'

function useLessonProgress(profile: { id: string } | null) {
  const [done, setDone] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')) }
    catch { return new Set() }
  })
  const { completeLesson } = useGameStore()

  function complete(id: string) {
    setDone(prev => {
      const next = new Set(prev)
      next.add(id)
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]))
      return next
    })
    if (profile) completeLesson(id)
    S.lesson()
  }

  return { done, complete }
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  lesson: Lesson
  isDone: boolean
  onComplete: (id: string) => void
  onClose: () => void
}

function LessonModal({ lesson, isDone, onComplete, onClose }: ModalProps) {
  const [step, setStep] = useState(0)
  const total = lesson.steps.length
  const current = lesson.steps[step]
  const color = CAT_COLORS[lesson.category] ?? '#f59e0b'
  const isLast = step === total - 1

  function finish() {
    if (!isDone) onComplete(lesson.id)
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 24 }}
        className="bg-gray-900 border border-gray-700 rounded-3xl w-full max-w-sm shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{lesson.icon}</span>
            <div>
              <p className="text-white font-bold text-sm">{lesson.title}</p>
              <p className="text-gray-500 text-xs">{step + 1} / {total}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-800">
          <motion.div
            className="h-full rounded-full"
            style={{ background: color }}
            initial={false}
            animate={{ width: `${((step + 1) / total) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="p-6"
          >
            <h3 className="text-white font-bold text-base mb-3">{current.title}</h3>
            <p className="text-gray-300 text-sm leading-relaxed">{current.content}</p>
            {current.tip && (
              <div
                className="mt-4 rounded-xl p-3 text-xs leading-relaxed"
                style={{ background: `${color}12`, border: `1px solid ${color}25`, color }}
              >
                💡 {current.tip}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer */}
        <div className="px-5 pb-5 flex items-center gap-3">
          {step > 0 && (
            <button
              onClick={() => { setStep(s => s - 1); S.click() }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 transition-colors"
            >
              <ArrowLeft size={14} /> Anterior
            </button>
          )}
          <div className="flex-1" />
          {isLast ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={finish}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors"
              style={{ background: color, color: '#000' }}
            >
              <Star size={14} />
              {isDone ? 'Cerrar' : `+${lesson.mcReward} MC`}
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => { setStep(s => s + 1); S.click() }}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors"
              style={{ background: color, color: '#000' }}
            >
              Siguiente <ArrowRight size={14} />
            </motion.button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Academia() {
  const { profile } = useGameStore()
  const { done, complete } = useLessonProgress(profile)
  const [active, setActive] = useState<Lesson | null>(null)

  const totalMC = done.size * 650
  const pct = Math.round((done.size / LESSONS.length) * 100)

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Academia Financiera</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Aprendé finanzas reales · {LESSONS.length} lecciones · Ganás MC al completar
        </p>
      </div>

      {/* XP / MC Banner */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="card bg-gradient-to-br from-green-900/30 to-gray-900 border-green-700/40 space-y-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎓</span>
            <div>
              <p className="font-bold text-sm text-white">
                +${totalMC.toLocaleString('es-AR')} MC ganados
              </p>
              <p className="text-xs text-gray-500">{done.size}/{LESSONS.length} lecciones completadas</p>
            </div>
          </div>
          <span className="text-mango-400 font-black text-lg">{pct}%</span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-green-500 to-mango-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, type: 'spring' }}
          />
        </div>
        <p className="text-xs text-gray-500">
          Cada lección completa te da <strong className="text-mango-400">650 MC</strong> directamente en tu cuenta.
        </p>
      </motion.div>

      {/* Lessons */}
      <div className="space-y-3">
        {LESSONS.map((lesson, i) => {
          const color = CAT_COLORS[lesson.category] ?? '#f59e0b'
          const isDone = done.has(lesson.id)
          const locked = i > done.size + 1

          return (
            <motion.div
              key={lesson.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              whileHover={!locked ? { scale: 1.02, x: 4 } : undefined}
              onClick={() => {
                if (locked) { S.error(); return }
                S.nav()
                setActive(lesson)
              }}
              className={`card transition-all cursor-pointer ${
                locked
                  ? 'opacity-40 cursor-not-allowed'
                  : isDone
                  ? 'border-green-700/40 bg-green-900/10'
                  : 'hover:border-gray-700'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0 mt-0.5">{lesson.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-bold text-sm text-white">{lesson.title}</p>
                    {isDone && <CheckCircle size={14} className="text-green-400 shrink-0" />}
                    {locked && <Lock size={12} className="text-gray-600 shrink-0" />}
                  </div>

                  <p className="text-xs text-gray-500 mb-2 leading-relaxed">{lesson.description}</p>

                  <div className="flex items-center gap-3">
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{ color, background: `${color}15` }}
                    >
                      {DIFF_LABEL[lesson.difficulty]}
                    </span>
                    <span className="text-[10px] text-gray-600 flex items-center gap-0.5">
                      <Clock size={10} /> {lesson.estimatedMinutes}min
                    </span>
                    <span className="text-[10px] text-mango-400 flex items-center gap-0.5">
                      <Star size={10} /> {lesson.mcReward} MC
                    </span>
                  </div>
                </div>
                {!locked && !isDone && (
                  <ChevronRight size={16} className="text-gray-600 shrink-0 mt-1" />
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      <AnimatePresence>
        {active && (
          <LessonModal
            lesson={active}
            isDone={done.has(active.id)}
            onComplete={complete}
            onClose={() => setActive(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
