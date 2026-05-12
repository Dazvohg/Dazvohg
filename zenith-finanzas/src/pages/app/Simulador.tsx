import { useState, useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Calculator, TrendingUp, Info } from 'lucide-react'

interface Instrument {
  id: string
  name: string
  shortName: string
  category: string
  annualReturn: number     // nominal annual %
  color: string
  description: string
  risk: 'bajo' | 'medio' | 'alto' | 'muy alto'
}

const INSTRUMENTS: Instrument[] = [
  // Pesos
  { id: 'pf_tradicional', name: 'Plazo Fijo Tradicional', shortName: 'PF Tradl.', category: 'Pesos', annualReturn: 37, color: '#6366f1', description: 'Tasa fija garantida por el banco. Liquidez al vencimiento.', risk: 'bajo' },
  { id: 'pf_uva', name: 'Plazo Fijo UVA', shortName: 'PF UVA', category: 'Pesos', annualReturn: 100, color: '#8b5cf6', description: 'Ajusta por inflación (CER). Plazo mínimo 90 días.', risk: 'bajo' },
  { id: 'lecap', name: 'LECAP', shortName: 'LECAP', category: 'Pesos', annualReturn: 55, color: '#a78bfa', description: 'Letra del Tesoro capitalizable. Mayor tasa que PF.', risk: 'bajo' },
  { id: 'money_market', name: 'FCI Money Market', shortName: 'MM FCI', category: 'Pesos', annualReturn: 65, color: '#7c3aed', description: 'Rescate en el día. Liquidez inmediata. Ideal para colchón.', risk: 'bajo' },
  // Dólares
  { id: 'dolar_mep', name: 'Dólar MEP (hold)', shortName: 'USD MEP', category: 'Dólares', annualReturn: 15, color: '#10b981', description: 'Devaluación esperada del tipo de cambio oficial + carry.', risk: 'medio' },
  { id: 'obligacion', name: 'Obligación Negociable', shortName: 'ON Hard $', category: 'Dólares', annualReturn: 8, color: '#059669', description: 'Bono corporativo en dólares. YPF, Pampa, etc.', risk: 'medio' },
  // Acciones
  { id: 'merval', name: 'MERVAL (promedio)', shortName: 'MERVAL', category: 'Acciones', annualReturn: 180, color: '#f59e0b', description: 'Índice de acciones argentinas. Alta volatilidad, alto retorno histórico.', risk: 'muy alto' },
  { id: 'cedear_spy', name: 'SPY CEDEAR (S&P500)', shortName: 'SPY', category: 'CEDEARs', annualReturn: 25, color: '#0ea5e9', description: 'ETF del S&P 500 en pesos. Sube con el CCL.', risk: 'medio' },
  { id: 'cedear_qqq', name: 'QQQ CEDEAR (Nasdaq)', shortName: 'QQQ', category: 'CEDEARs', annualReturn: 30, color: '#38bdf8', description: 'ETF del Nasdaq 100. Tecnología americana.', risk: 'alto' },
  // Cripto
  { id: 'btc', name: 'Bitcoin (BTC)', shortName: 'BTC', category: 'Cripto', annualReturn: 60, color: '#f97316', description: 'La cripto más líquida y establecida. Ciclos de 4 años.', risk: 'muy alto' },
  { id: 'eth', name: 'Ethereum (ETH)', shortName: 'ETH', category: 'CEDEARs', annualReturn: 70, color: '#fb923c', description: 'Plataforma de contratos inteligentes.', risk: 'muy alto' },
  // Real estate
  { id: 'bono_al30', name: 'Bono Soberano AL30', shortName: 'AL30', category: 'Bonos', annualReturn: 20, color: '#ef4444', description: 'Bono en dólares del Tesoro argentino. Riesgo soberano.', risk: 'alto' },
  { id: 'bono_cer', name: 'Bono CER TX28', shortName: 'TX28 CER', category: 'Bonos', annualReturn: 110, color: '#dc2626', description: 'Bono soberano ajustado por inflación.', risk: 'medio' },
]

const RISK_COLOR: Record<string, string> = {
  bajo: '#10b981',
  medio: '#f59e0b',
  alto: '#ef4444',
  'muy alto': '#dc2626',
}

const RISK_LABEL: Record<string, string> = {
  bajo: 'Bajo',
  medio: 'Medio',
  alto: 'Alto',
  'muy alto': 'Muy alto',
}

function generateProjection(principal: number, annualReturn: number, months: number) {
  return Array.from({ length: months + 1 }, (_, i) => {
    const monthly = annualReturn / 100 / 12
    return {
      mes: i,
      value: Math.round(principal * Math.pow(1 + monthly, i)),
    }
  })
}

const fmtARS = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(2)}M`
    : n >= 1_000
    ? `$${(n / 1_000).toFixed(0)}K`
    : `$${n.toFixed(0)}`

export default function Simulador() {
  const [principal, setPrincipal] = useState(500000)
  const [months, setMonths] = useState(12)
  const [selected, setSelected] = useState<string[]>(['pf_uva', 'cedear_spy', 'merval'])

  const selectedInstruments = INSTRUMENTS.filter(i => selected.includes(i.id))

  const chartData = useMemo(() => {
    if (selectedInstruments.length === 0) return []
    const len = months + 1
    return Array.from({ length: len }, (_, m) => {
      const point: Record<string, number | string> = { mes: `M${m}` }
      selectedInstruments.forEach(inst => {
        const monthly = inst.annualReturn / 100 / 12
        point[inst.shortName] = Math.round(principal * Math.pow(1 + monthly, m))
      })
      return point
    })
  }, [selectedInstruments, principal, months])

  function toggleInstrument(id: string) {
    setSelected(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : prev.length < 4
        ? [...prev, id]
        : prev
    )
  }

  const finalValues = selectedInstruments.map(inst => {
    const monthly = inst.annualReturn / 100 / 12
    const final = Math.round(principal * Math.pow(1 + monthly, months))
    return { inst, final, gain: final - principal, pct: ((final - principal) / principal) * 100 }
  }).sort((a, b) => b.final - a.final)

  const categories = [...new Set(INSTRUMENTS.map(i => i.category))]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-[#f8fafc] font-semibold text-base">Simulador de Inversiones</h1>
        <p className="text-[#64748b] text-xs mt-0.5">Compará rendimientos proyectados · Basado en tasas históricas promedio</p>
      </div>

      {/* Controls */}
      <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calculator size={15} className="text-[#6366f1]" />
          <span className="text-[#f8fafc] font-semibold text-sm">Parámetros</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="text-[#64748b] text-xs block mb-1.5">Capital inicial (ARS)</label>
            <input
              type="number"
              value={principal}
              onChange={e => setPrincipal(Number(e.target.value))}
              className="w-full bg-[#0c1221] border border-[#1e293b] rounded-lg px-3 py-2 text-[#f8fafc] font-mono text-sm outline-none focus:border-[#334155] tabular-nums"
            />
            <div className="flex gap-2 mt-2">
              {[100000, 500000, 1000000, 5000000].map(v => (
                <button
                  key={v}
                  onClick={() => setPrincipal(v)}
                  className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
                    principal === v
                      ? 'bg-[#6366f1]/20 text-[#6366f1] border border-[#6366f1]/30'
                      : 'bg-[#1e293b] text-[#64748b] hover:text-[#f8fafc]'
                  }`}
                >
                  {fmtARS(v)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[#64748b] text-xs block mb-1.5">Horizonte: {months} meses</label>
            <input
              type="range"
              min={1}
              max={60}
              value={months}
              onChange={e => setMonths(Number(e.target.value))}
              className="w-full accent-[#6366f1]"
            />
            <div className="flex justify-between text-[#475569] text-[10px] mt-1">
              <span>1 mes</span>
              <span>1 año</span>
              <span>2 años</span>
              <span>5 años</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Instrument selector */}
        <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-5">
          <div className="text-[#f8fafc] font-semibold text-sm mb-1">Instrumentos</div>
          <div className="text-[#64748b] text-xs mb-4">Seleccioná hasta 4 para comparar</div>
          <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
            {categories.map(cat => (
              <div key={cat}>
                <div className="text-[#475569] text-[10px] font-semibold uppercase tracking-wider mb-2">{cat}</div>
                <div className="space-y-1.5">
                  {INSTRUMENTS.filter(i => i.category === cat).map(inst => {
                    const isOn = selected.includes(inst.id)
                    return (
                      <button
                        key={inst.id}
                        onClick={() => toggleInstrument(inst.id)}
                        className={`w-full text-left rounded-lg px-3 py-2.5 transition-colors border ${
                          isOn
                            ? 'border-opacity-50 bg-opacity-10'
                            : 'border-[#1e293b] hover:border-[#334155]'
                        }`}
                        style={isOn ? { borderColor: inst.color, background: `${inst.color}10` } : {}}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold" style={{ color: isOn ? inst.color : '#94a3b8' }}>
                            {inst.name}
                          </span>
                          <span
                            className="text-[10px] font-mono font-bold"
                            style={{ color: RISK_COLOR[inst.risk] }}
                          >
                            {inst.annualReturn}% TNA
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className="text-[9px] px-1 py-0.5 rounded"
                            style={{ color: RISK_COLOR[inst.risk], background: `${RISK_COLOR[inst.risk]}15` }}
                          >
                            Riesgo {RISK_LABEL[inst.risk]}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart + results */}
        <div className="lg:col-span-2 space-y-4">
          {/* Results */}
          {finalValues.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {finalValues.map(({ inst, final, gain, pct }) => (
                <div
                  key={inst.id}
                  className="bg-[#111827] border rounded-xl p-4"
                  style={{ borderColor: `${inst.color}30` }}
                >
                  <div className="text-xs font-semibold mb-2" style={{ color: inst.color }}>
                    {inst.shortName}
                  </div>
                  <div className="font-mono font-bold text-[#f8fafc] text-sm tabular-nums">{fmtARS(final)}</div>
                  <div className="font-mono text-[#10b981] text-xs tabular-nums">+{fmtARS(gain)}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp size={11} className="text-[#10b981]" />
                    <span className="text-[#10b981] text-[10px] font-mono">+{pct.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Chart */}
          <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={14} className="text-[#10b981]" />
              <span className="text-[#f8fafc] font-semibold text-sm">Proyección a {months} meses</span>
            </div>
            {selectedInstruments.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-[#475569] text-sm">
                Seleccioná al menos un instrumento
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartData}>
                  <defs>
                    {selectedInstruments.map(inst => (
                      <linearGradient key={inst.id} id={`grad-${inst.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={inst.color} stopOpacity={0.25} />
                        <stop offset="100%" stopColor={inst.color} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <XAxis
                    dataKey="mes"
                    tick={{ fill: '#475569', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    interval={Math.ceil(months / 6)}
                  />
                  <YAxis
                    tick={{ fill: '#475569', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={fmtARS}
                    width={60}
                  />
                  <Tooltip
                    contentStyle={{ background: '#0c1221', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }}
                    labelStyle={{ color: '#64748b' }}
                    formatter={(v: number, name: string) => [fmtARS(v), name]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
                  {selectedInstruments.map(inst => (
                    <Area
                      key={inst.id}
                      type="monotone"
                      dataKey={inst.shortName}
                      stroke={inst.color}
                      strokeWidth={2}
                      fill={`url(#grad-${inst.id})`}
                      dot={false}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Disclaimer */}
          <div className="flex gap-2 text-[#475569] text-xs bg-[#0c1221] border border-[#1e293b] rounded-xl p-3">
            <Info size={13} className="shrink-0 mt-0.5" />
            <span>
              Rendimientos basados en promedios históricos. No constituye asesoramiento financiero.
              El MERVAL y las acciones tienen alta volatilidad — los retornos reales pueden diferir significativamente.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
