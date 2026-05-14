import { useState } from 'react'
import { CheckCircle, Lock, Clock, Star, ChevronRight, X, ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react'
import { lessons, type Lesson } from '@/data/lessons'

const CATEGORY_COLORS: Record<string, string> = {
  presupuesto: '#f59e0b',
  deuda:       '#ef4444',
  ahorro:      '#1D9BF0',
  inversión:   '#1D9BF0',
  mercados:    '#1D9BF0',
}

const DIFFICULTY_LABEL: Record<string, string> = {
  básico:      'Básico',
  intermedio:  'Intermedio',
  avanzado:    'Avanzado',
}

function useLessonProgress() {
  const key = 'zenith_lessons_done'
  const [done, setDone] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem(key) ?? '[]')) }
    catch { return new Set() }
  })
  function complete(id: string) {
    setDone(prev => {
      const next = new Set(prev)
      next.add(id)
      localStorage.setItem(key, JSON.stringify([...next]))
      return next
    })
  }
  return { done, complete }
}

interface LessonModalProps {
  lesson: Lesson
  isDone: boolean
  onComplete: (id: string) => void
  onClose: () => void
}

function LessonModal({ lesson, isDone, onComplete, onClose }: LessonModalProps) {
  const [step, setStep] = useState(0)
  const total = lesson.steps.length
  const current = lesson.steps[step]
  const color = CATEGORY_COLORS[lesson.category] ?? '#1D9BF0'
  const isLast = step === total - 1

  function handleFinish() {
    if (!isDone) onComplete(lesson.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#000000] border border-[#2F3336] rounded-2xl w-full max-w-lg shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#2F3336]">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{lesson.icon}</span>
            <div>
              <div className="text-[#E7E9EA] font-bold text-sm">{lesson.title}</div>
              <div className="text-[#71767B] text-xs">{step + 1} / {total}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-[#71767B] hover:text-[#E7E9EA] transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-[#2F3336]">
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${((step + 1) / total) * 100}%`, background: color }}
          />
        </div>

        {/* Content */}
        <div className="p-6 flex-1">
          <h2 className="text-[#E7E9EA] font-bold text-base mb-3">{current.title}</h2>
          <p className="text-[#8B98A5] text-sm leading-relaxed">{current.content}</p>
          {current.tip && (
            <div
              className="mt-4 rounded-xl p-3 text-xs"
              style={{ background: `${color}12`, border: `1px solid ${color}25`, color }}
            >
              💡 {current.tip}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-[#71767B] hover:text-[#E7E9EA] bg-[#2F3336] hover:bg-[#3E4144] transition-colors"
            >
              <ArrowLeft size={14} /> Anterior
            </button>
          )}
          <div className="flex-1" />
          {isLast ? (
            <button
              onClick={handleFinish}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold text-black transition-colors"
              style={{ background: color }}
            >
              <Star size={14} /> Completar +{lesson.xpReward} XP
            </button>
          ) : (
            <button
              onClick={() => setStep(s => s + 1)}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold text-black transition-colors"
              style={{ background: color }}
            >
              Siguiente <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Academia() {
  const { done, complete } = useLessonProgress()
  const [active, setActive] = useState<Lesson | null>(null)

  const totalXP = [...done].length * 650
  const pct = Math.round((done.size / lessons.length) * 100)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-[#E7E9EA] font-semibold text-base">Academia Mango</h1>
        <p className="text-[#71767B] text-xs mt-0.5">Formación financiera argentina · {lessons.length} lecciones</p>
      </div>

      {/* XP banner */}
      <div className="bg-gradient-to-r from-[#0A1929]/60 to-[#0A1929]/30 border border-[#1D9BF0]/20 rounded-2xl p-5 flex gap-5 items-center">
        <div className="w-12 h-12 rounded-2xl bg-[#1D9BF0]/20 border border-[#1D9BF0]/30 flex items-center justify-center text-2xl shrink-0">
          🎓
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#E7E9EA] font-bold">{totalXP.toLocaleString('es-AR')} XP acumulados</span>
            <span className="text-[#71767B] text-xs">{done.size}/{lessons.length} completadas</span>
          </div>
          <div className="h-2 bg-[#2F3336] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#1D9BF0] to-[#1D9BF0] rounded-full transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="text-[#71767B] text-xs mt-1">{pct}% completado</div>
        </div>
      </div>

      {/* Lessons grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {lessons.map((lesson, i) => {
          const color = CATEGORY_COLORS[lesson.category] ?? '#1D9BF0'
          const isDone = done.has(lesson.id)
          const locked = i > done.size + 1

          return (
            <div
              key={lesson.id}
              onClick={() => !locked && setActive(lesson)}
              className={`bg-[#16181C] border rounded-xl p-5 transition-all cursor-pointer ${
                locked
                  ? 'border-[#2F3336] opacity-40 cursor-not-allowed'
                  : isDone
                  ? 'border-[#1D9BF0]/30 hover:border-[#1D9BF0]/50'
                  : 'border-[#2F3336] hover:border-[#3E4144]'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-2xl">{lesson.icon}</span>
                {isDone ? (
                  <CheckCircle size={16} className="text-[#1D9BF0] shrink-0" />
                ) : locked ? (
                  <Lock size={14} className="text-[#3E4144] shrink-0" />
                ) : (
                  <ChevronRight size={16} className="text-[#3E4144] shrink-0" />
                )}
              </div>

              <div
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded mb-2 inline-block"
                style={{ color, background: `${color}15` }}
              >
                {DIFFICULTY_LABEL[lesson.difficulty]}
              </div>

              <div className="text-[#E7E9EA] font-semibold text-sm mb-1">{lesson.title}</div>
              <p className="text-[#71767B] text-xs leading-relaxed mb-3">{lesson.description}</p>

              <div className="flex items-center gap-3 text-[#475569] text-xs">
                <span className="flex items-center gap-1"><Clock size={11} /> {lesson.estimatedMinutes}min</span>
                <span className="flex items-center gap-1"><Star size={11} /> {lesson.xpReward} XP</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Mango Tycoon CTA */}
      <div className="bg-gradient-to-r from-[#0A1929]/30 to-[#0A1929]/30 border border-[#1D9BF0]/20 rounded-2xl p-5 flex gap-4 items-center">
        <div className="w-12 h-12 rounded-2xl bg-[#1D9BF0]/20 border border-[#1D9BF0]/30 flex items-center justify-center text-2xl shrink-0">
          🥭
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[#E7E9EA] font-bold text-sm mb-1">Mango Tycoon — Aprendé jugando</div>
          <p className="text-[#8B98A5] text-xs">
            Invertí en empresas, bonos y activos argentinos en un simulador gamificado. Competí en el ranking global.
          </p>
        </div>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-[#1D9BF0] bg-[#1D9BF0]/10 border border-[#1D9BF0]/20 hover:bg-[#1D9BF0]/20 transition-colors shrink-0"
        >
          Jugar <ExternalLink size={13} />
        </a>
      </div>

      {active && (
        <LessonModal
          lesson={active}
          isDone={done.has(active.id)}
          onComplete={complete}
          onClose={() => setActive(null)}
        />
      )}
    </div>
  )
}
