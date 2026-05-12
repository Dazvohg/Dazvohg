import { useState, useEffect } from 'react'
import { PlusCircle, Trash2, Target, Wallet, TrendingDown, AlertCircle, RefreshCw } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { useArgentineData } from '@/hooks/useArgentineData'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Expense {
  id: string
  description: string
  amount: number
  category: string
  date: string
}

interface Goal {
  id: string
  name: string
  target: number
  current: number
  icon: string
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'vivienda',    label: 'Vivienda',     color: '#6366f1', icon: '🏠' },
  { id: 'comida',     label: 'Comida',        color: '#10b981', icon: '🛒' },
  { id: 'transporte', label: 'Transporte',    color: '#0ea5e9', icon: '🚗' },
  { id: 'salud',      label: 'Salud',         color: '#f59e0b', icon: '💊' },
  { id: 'educacion',  label: 'Educación',     color: '#8b5cf6', icon: '📚' },
  { id: 'entretenimiento', label: 'Entretenim.', color: '#ec4899', icon: '🎬' },
  { id: 'servicios',  label: 'Servicios',     color: '#ef4444', icon: '💡' },
  { id: 'otros',      label: 'Otros',         color: '#64748b', icon: '📦' },
]

const CAT_MAP = Object.fromEntries(CATEGORIES.map(c => [c.id, c]))

// ─── Storage ───────────────────────────────────────────────────────────────────

function load<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? '') as T }
  catch { return fallback }
}

function save<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value))
}

// ─── Dollar rates panel ────────────────────────────────────────────────────────

function DollarPanel() {
  const { dolar, inflation, riesgoPais, loading, lastUpdated, refetch } = useArgentineData()

  const dolarOficial = dolar.find(d => d.casa === 'oficial')
  const dolarBlue    = dolar.find(d => d.casa === 'blue')
  const dolarMep     = dolar.find(d => d.casa === 'bolsa')
  const lastInflation = inflation[inflation.length - 1]
  const lastRp = riesgoPais[riesgoPais.length - 1]

  const fmt = (n: number | null | undefined) =>
    n != null ? n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }) : '—'

  return (
    <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[#f8fafc] font-semibold text-sm">Indicadores de Mercado</div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-[#475569] text-[10px]">
              {lastUpdated.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={refetch}
            disabled={loading}
            className="p-1 text-[#64748b] hover:text-[#f8fafc] transition-colors disabled:opacity-40"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading && dolar.length === 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-[#1e293b] rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Dólar Oficial', val: dolarOficial?.venta, color: '#10b981' },
            { label: 'Dólar Blue',   val: dolarBlue?.venta,    color: '#f59e0b' },
            { label: 'Dólar MEP',    val: dolarMep?.venta,     color: '#6366f1' },
            { label: 'Inflación',    val: lastInflation ? `${lastInflation.valor}%` : '—', color: '#ef4444', raw: true },
            { label: 'Riesgo País',  val: lastRp ? `${lastRp.valor.toLocaleString('es-AR')} pb` : '—', color: '#0ea5e9', raw: true },
          ].map(item => (
            <div key={item.label} className="bg-[#0c1221] rounded-lg p-3">
              <div className="text-[#64748b] text-[10px] mb-1">{item.label}</div>
              <div className="font-mono font-bold text-sm" style={{ color: item.color }}>
                {item.raw ? item.val : fmt(item.val as number)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────────

export default function Finanzas() {
  const [expenses, setExpenses] = useState<Expense[]>(() =>
    load('zenith_expenses', [] as Expense[])
  )
  const [goals, setGoals] = useState<Goal[]>(() =>
    load('zenith_goals', [
      { id: '1', name: 'Colchón de emergencias', target: 1500000, current: 450000, icon: '🛡️' },
      { id: '2', name: 'Fondo dólar MEP',        target: 500000,  current: 120000, icon: '💵' },
    ] as Goal[])
  )
  const [budget, setBudget] = useState<number>(() => load('zenith_budget', 800000))

  // Form state
  const [desc, setDesc] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('comida')

  // Goal form
  const [goalName, setGoalName] = useState('')
  const [goalTarget, setGoalTarget] = useState('')
  const [goalIcon, setGoalIcon] = useState('🎯')
  const [showGoalForm, setShowGoalForm] = useState(false)

  // Month filter — default current month
  const now = new Date()
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)

  useEffect(() => { save('zenith_expenses', expenses) }, [expenses])
  useEffect(() => { save('zenith_goals', goals) }, [goals])
  useEffect(() => { save('zenith_budget', budget) }, [budget])

  const monthExpenses = expenses.filter(e => e.date.startsWith(month))
  const totalMonth = monthExpenses.reduce((s, e) => s + e.amount, 0)
  const remaining = budget - totalMonth
  const overBudget = remaining < 0

  // By category for charts
  const byCategory = CATEGORIES.map(c => ({
    name: c.label,
    value: monthExpenses.filter(e => e.category === c.id).reduce((s, e) => s + e.amount, 0),
    color: c.color,
    icon: c.icon,
  })).filter(c => c.value > 0)

  // Last 6 months bar chart
  const last6 = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const total = expenses.filter(e => e.date.startsWith(key)).reduce((s, e) => s + e.amount, 0)
    return { month: d.toLocaleDateString('es-AR', { month: 'short' }), total }
  })

  function addExpense() {
    if (!desc.trim() || !amount || isNaN(Number(amount)) || Number(amount) <= 0) return
    const next: Expense = {
      id: Date.now().toString(),
      description: desc.trim(),
      amount: Number(amount),
      category,
      date: new Date().toISOString().slice(0, 10),
    }
    setExpenses(prev => [next, ...prev])
    setDesc('')
    setAmount('')
  }

  function deleteExpense(id: string) {
    setExpenses(prev => prev.filter(e => e.id !== id))
  }

  function addGoal() {
    if (!goalName.trim() || !goalTarget || isNaN(Number(goalTarget))) return
    setGoals(prev => [...prev, {
      id: Date.now().toString(),
      name: goalName.trim(),
      target: Number(goalTarget),
      current: 0,
      icon: goalIcon,
    }])
    setGoalName(''); setGoalTarget(''); setShowGoalForm(false)
  }

  function updateGoalProgress(id: string, delta: number) {
    setGoals(prev => prev.map(g =>
      g.id === id ? { ...g, current: Math.max(0, Math.min(g.target, g.current + delta)) } : g
    ))
  }

  function deleteGoal(id: string) {
    setGoals(prev => prev.filter(g => g.id !== id))
  }

  const fmtARS = (n: number) =>
    n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-[#f8fafc] font-semibold text-base">Finanzas Personales</h1>
        <p className="text-[#64748b] text-xs mt-0.5">Control de gastos, presupuesto y metas de ahorro</p>
      </div>

      {/* Dollar rates */}
      <DollarPanel />

      {/* Budget summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-5">
          <div className="text-[#64748b] text-xs mb-1">Presupuesto mensual</div>
          <div className="flex items-center gap-2">
            <Wallet size={16} className="text-[#6366f1]" />
            <input
              type="number"
              value={budget}
              onChange={e => setBudget(Number(e.target.value))}
              className="bg-transparent font-mono font-bold text-lg text-[#f8fafc] w-full outline-none tabular-nums"
              placeholder="800000"
            />
          </div>
          <div className="text-[#475569] text-xs mt-1">ARS / mes</div>
        </div>

        <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-5">
          <div className="text-[#64748b] text-xs mb-1">Gastado este mes</div>
          <div className="font-mono font-bold text-lg text-[#ef4444]">{fmtARS(totalMonth)}</div>
          <div className="mt-2 h-1.5 bg-[#1e293b] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${overBudget ? 'bg-[#ef4444]' : 'bg-[#10b981]'}`}
              style={{ width: `${Math.min(100, (totalMonth / budget) * 100)}%` }}
            />
          </div>
          <div className="text-[#475569] text-xs mt-1">{Math.round((totalMonth / budget) * 100)}% del presupuesto</div>
        </div>

        <div className={`rounded-xl p-5 border ${overBudget ? 'bg-[#450a0a]/30 border-[#ef4444]/30' : 'bg-[#111827] border-[#1e293b]'}`}>
          <div className="text-[#64748b] text-xs mb-1">
            {overBudget ? 'Excedido en' : 'Disponible'}
          </div>
          <div className={`font-mono font-bold text-lg flex items-center gap-2 ${overBudget ? 'text-[#ef4444]' : 'text-[#10b981]'}`}>
            {overBudget && <AlertCircle size={16} />}
            {fmtARS(Math.abs(remaining))}
          </div>
          <div className="text-[#475569] text-xs mt-1">{monthExpenses.length} gastos registrados</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Add expense */}
        <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-5">
          <div className="text-[#f8fafc] font-semibold text-sm mb-4 flex items-center gap-2">
            <TrendingDown size={15} className="text-[#ef4444]" /> Registrar gasto
          </div>
          <div className="space-y-3">
            <input
              value={desc}
              onChange={e => setDesc(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addExpense()}
              placeholder="Descripción"
              className="w-full bg-[#0c1221] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-[#f8fafc] placeholder-[#475569] outline-none focus:border-[#334155]"
            />
            <div className="flex gap-2">
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addExpense()}
                placeholder="Monto ARS"
                className="flex-1 bg-[#0c1221] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-[#f8fafc] placeholder-[#475569] outline-none focus:border-[#334155] font-mono"
              />
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="bg-[#0c1221] border border-[#1e293b] rounded-lg px-2 py-2 text-sm text-[#f8fafc] outline-none focus:border-[#334155]"
              >
                {CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={addExpense}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#10b981]/10 border border-[#10b981]/20 text-[#10b981] text-sm font-semibold hover:bg-[#10b981]/20 transition-colors"
            >
              <PlusCircle size={15} /> Agregar
            </button>
          </div>

          {/* Expense list */}
          <div className="mt-4 space-y-1.5 max-h-64 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#64748b] text-xs">Mes:</span>
              <input
                type="month"
                value={month}
                onChange={e => setMonth(e.target.value)}
                className="bg-[#0c1221] border border-[#1e293b] rounded px-2 py-0.5 text-xs text-[#94a3b8] outline-none"
              />
            </div>
            {monthExpenses.length === 0 && (
              <div className="text-[#475569] text-xs text-center py-6">Sin gastos este mes</div>
            )}
            {monthExpenses.map(e => {
              const cat = CAT_MAP[e.category]
              return (
                <div key={e.id} className="flex items-center gap-2 py-1.5 border-b border-[#1e293b]/50 group">
                  <span className="text-base">{cat?.icon ?? '📦'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[#f8fafc] text-xs truncate">{e.description}</div>
                    <div className="text-[#475569] text-[10px]">{e.date} · {cat?.label}</div>
                  </div>
                  <div className="font-mono text-xs text-[#ef4444] tabular-nums">{fmtARS(e.amount)}</div>
                  <button
                    onClick={() => deleteExpense(e.id)}
                    className="text-[#334155] hover:text-[#ef4444] transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Charts */}
        <div className="space-y-4">
          {/* Pie by category */}
          {byCategory.length > 0 && (
            <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-5">
              <div className="text-[#f8fafc] font-semibold text-sm mb-4">Por categoría</div>
              <div className="flex gap-4">
                <PieChart width={120} height={120}>
                  <Pie data={byCategory} cx={55} cy={55} innerRadius={30} outerRadius={55} dataKey="value" paddingAngle={2}>
                    {byCategory.map((c, i) => <Cell key={i} fill={c.color} />)}
                  </Pie>
                </PieChart>
                <div className="flex-1 space-y-1.5">
                  {byCategory.map(c => (
                    <div key={c.name} className="flex items-center gap-2">
                      <span className="text-sm">{c.icon}</span>
                      <div className="flex-1 h-1.5 bg-[#1e293b] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${(c.value / totalMonth) * 100}%`, background: c.color }}
                        />
                      </div>
                      <span className="font-mono text-[10px] text-[#94a3b8] tabular-nums w-16 text-right">
                        {Math.round((c.value / totalMonth) * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 6 month bar chart */}
          <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-5">
            <div className="text-[#f8fafc] font-semibold text-sm mb-4">Últimos 6 meses</div>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={last6} barSize={20}>
                <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: '#0c1221', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }}
                  labelStyle={{ color: '#94a3b8' }}
                  formatter={(v: number) => [fmtARS(v), 'Gastos']}
                />
                <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Goals */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[#f8fafc] font-semibold text-sm flex items-center gap-2">
            <Target size={15} className="text-[#10b981]" /> Metas de ahorro
          </div>
          <button
            onClick={() => setShowGoalForm(v => !v)}
            className="text-xs flex items-center gap-1 text-[#64748b] hover:text-[#10b981] transition-colors"
          >
            <PlusCircle size={13} /> Nueva meta
          </button>
        </div>

        {showGoalForm && (
          <div className="mb-4 bg-[#0c1221] border border-[#1e293b] rounded-xl p-4 flex gap-2 flex-wrap">
            <input
              value={goalIcon}
              onChange={e => setGoalIcon(e.target.value)}
              placeholder="🎯"
              className="w-12 bg-[#111827] border border-[#1e293b] rounded-lg px-2 py-1.5 text-center text-sm text-[#f8fafc] outline-none"
            />
            <input
              value={goalName}
              onChange={e => setGoalName(e.target.value)}
              placeholder="Nombre de la meta"
              className="flex-1 bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-1.5 text-sm text-[#f8fafc] placeholder-[#475569] outline-none focus:border-[#334155]"
            />
            <input
              type="number"
              value={goalTarget}
              onChange={e => setGoalTarget(e.target.value)}
              placeholder="Objetivo ARS"
              className="w-36 bg-[#111827] border border-[#1e293b] rounded-lg px-3 py-1.5 text-sm text-[#f8fafc] placeholder-[#475569] outline-none font-mono"
            />
            <button
              onClick={addGoal}
              className="px-4 py-1.5 rounded-lg bg-[#10b981] text-black text-sm font-semibold hover:bg-[#059669] transition-colors"
            >
              Crear
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map(g => {
            const pct = Math.min(100, Math.round((g.current / g.target) * 100))
            return (
              <div key={g.id} className="bg-[#0c1221] rounded-xl p-4 group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{g.icon}</span>
                    <span className="text-[#f8fafc] text-sm font-semibold">{g.name}</span>
                  </div>
                  <button
                    onClick={() => deleteGoal(g.id)}
                    className="text-[#334155] hover:text-[#ef4444] transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-mono text-[#10b981] tabular-nums">{fmtARS(g.current)}</span>
                  <span className="text-[#475569]">de {fmtARS(g.target)}</span>
                </div>
                <div className="h-2 bg-[#1e293b] rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full bg-gradient-to-r from-[#10b981] to-[#6366f1] rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#475569] text-xs">{pct}%</span>
                  <div className="flex-1" />
                  <button
                    onClick={() => updateGoalProgress(g.id, -50000)}
                    className="text-[10px] px-2 py-0.5 rounded bg-[#1e293b] text-[#64748b] hover:text-[#f8fafc] transition-colors"
                  >
                    -50k
                  </button>
                  <button
                    onClick={() => updateGoalProgress(g.id, 50000)}
                    className="text-[10px] px-2 py-0.5 rounded bg-[#10b981]/10 text-[#10b981] hover:bg-[#10b981]/20 transition-colors"
                  >
                    +50k
                  </button>
                  <button
                    onClick={() => updateGoalProgress(g.id, 100000)}
                    className="text-[10px] px-2 py-0.5 rounded bg-[#10b981]/10 text-[#10b981] hover:bg-[#10b981]/20 transition-colors"
                  >
                    +100k
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
