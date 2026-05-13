import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Building2, TrendingUp, Zap, ChevronRight, AlertCircle } from 'lucide-react'
import { useGameStore } from '../../game/store/gameStore'
import type { RepSector } from '../../types/game'

interface CompanyType {
  id: string
  label: string
  icon: string
  sector: RepSector
  description: string
  exampleName: string
}

const COMPANY_TYPES: CompanyType[] = [
  {
    id: 'bodega',     label: 'Bodega',          icon: '🍷', sector: 'agro',
    description: 'Producción de vino premium para el mercado local y exportación.',
    exampleName: 'Bodega Don Mango',
  },
  {
    id: 'startup',    label: 'Tech Startup',    icon: '💻', sector: 'financial',
    description: 'Software as a Service o fintech. Escalable y con potencial de unicornio.',
    exampleName: 'MangoTech S.R.L.',
  },
  {
    id: 'exportadora',label: 'Exportadora',     icon: '🚢', sector: 'agro',
    description: 'Compra commodities agro en Argentina y los exporta al mundo.',
    exampleName: 'Exportaciones del Sur',
  },
  {
    id: 'hotel',      label: 'Hotel Boutique',  icon: '🏨', sector: 'tourism',
    description: 'Hospedaje de lujo en un destino turístico de Argentina.',
    exampleName: 'Hotel El Mango Real',
  },
  {
    id: 'constructora',label: 'Constructora',  icon: '🏗️', sector: 'real_estate',
    description: 'Construye y vende propiedades en ciudades en crecimiento.',
    exampleName: 'Construcciones Pampa',
  },
  {
    id: 'solar',      label: 'Energía Solar',   icon: '☀️', sector: 'energy',
    description: 'Desarrollo e instalación de parques solares bajo el programa RenovAr.',
    exampleName: 'SolarPampa S.A.',
  },
]

const CAPITAL_TIERS = [
  { value: 500,  label: '500 MC',  yield: '0.8%/día', description: 'Microempresa — arrancar desde cero' },
  { value: 1000, label: '1.000 MC', yield: '1.0%/día', description: 'PyME inicial — operación básica' },
  { value: 2500, label: '2.500 MC', yield: '1.3%/día', description: 'Empresa en marcha — equipo completo' },
  { value: 5000, label: '5.000 MC', yield: '1.6%/día', description: 'Empresa consolidada — escala regional' },
]

type Step = 'landing' | 'choose_type' | 'choose_capital' | 'name' | 'confirm' | 'active'

export default function Company() {
  const { profile, ownedCompany, foundCompany, expandCompany } = useGameStore()

  const [step, setStep] = useState<Step>(ownedCompany ? 'active' : 'landing')
  const [selectedType, setSelectedType] = useState<CompanyType | null>(null)
  const [selectedCapital, setSelectedCapital] = useState(CAPITAL_TIERS[1])
  const [companyName, setCompanyName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [expandAmount, setExpandAmount] = useState(1000)

  const handleFound = async () => {
    if (!selectedType || !companyName.trim()) return
    setBusy(true)
    setError('')
    try {
      await foundCompany(companyName.trim(), selectedType.id, selectedType.sector, selectedCapital.value)
      setStep('active')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const handleExpand = async () => {
    setBusy(true)
    setError('')
    try {
      await expandCompany(expandAmount)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  if (!profile) return null

  // ── ACTIVE COMPANY ──────────────────────────────────────────────────────────
  if (ownedCompany || step === 'active') {
    const company = ownedCompany!
    const dailyIncome = Math.round(company.capitalInvested * company.yieldRate / 100)
    const capitalTiers = [0, 1000, 2500, 5000, 10000]
    const nextTier = capitalTiers.find((t) => t > company.capitalInvested) ?? 10000
    const pctToNext = Math.min((company.capitalInvested / nextTier) * 100, 100)

    const nextYield =
      nextTier >= 10000 ? 2.0 :
      nextTier >= 5000  ? 1.6 :
      nextTier >= 2500  ? 1.3 : 1.0

    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold">Mi Empresa</h2>
          <p className="text-xs text-gray-500">Gestioná tu negocio propio</p>
        </div>

        {/* Company card */}
        <div className="card bg-gradient-to-br from-mango-900/40 to-gray-900 border-mango-700/50 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">
              {COMPANY_TYPES.find((t) => t.id === company.type)?.icon ?? '🏢'}
            </span>
            <div>
              <p className="font-bold text-lg text-mango-400">{company.name}</p>
              <p className="text-xs text-gray-400">
                {COMPANY_TYPES.find((t) => t.id === company.type)?.label ?? company.type}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-900 rounded-xl p-2 text-center">
              <p className="text-xs text-gray-500">Capital</p>
              <p className="font-bold text-sm text-mango-400">{company.capitalInvested.toLocaleString('es-AR')}</p>
            </div>
            <div className="bg-gray-900 rounded-xl p-2 text-center">
              <p className="text-xs text-gray-500">Renta/día</p>
              <p className="font-bold text-sm text-green-400">{company.yieldRate}%</p>
            </div>
            <div className="bg-gray-900 rounded-xl p-2 text-center">
              <p className="text-xs text-gray-500">MC/día</p>
              <p className="font-bold text-sm text-green-400">+{dailyIncome}</p>
            </div>
          </div>

          {/* Progress to next tier */}
          {company.capitalInvested < 10000 && (
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Capital actual: {company.capitalInvested.toLocaleString('es-AR')}</span>
                <span>Siguiente tier: {nextTier.toLocaleString('es-AR')} → {nextYield}%/día</span>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-mango-400 rounded-full transition-all duration-700"
                  style={{ width: `${pctToNext}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Last event */}
        {company.lastEventDesc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`card border ${
              company.lastEventDelta >= 0
                ? 'border-green-700/50 bg-green-900/20'
                : 'border-red-700/50 bg-red-900/20'
            }`}
          >
            <p className="text-xs font-bold text-gray-300 mb-1">
              {company.lastEventDelta >= 0 ? '📈' : '📉'} Último evento de negocio
            </p>
            <p className="text-xs text-gray-400">{company.lastEventDesc}</p>
            <p className={`text-sm font-bold mt-1 ${
              company.lastEventDelta >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {company.lastEventDelta >= 0 ? '+' : ''}{company.lastEventDelta} MC
            </p>
            {company.lastEventAt && (
              <p className="text-xs text-gray-600 mt-1">
                {new Date(company.lastEventAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </motion.div>
        )}

        {/* Expansion */}
        {company.capitalInvested < 10000 && (
          <div className="card space-y-3">
            <p className="font-bold text-sm">Expandir empresa</p>
            <p className="text-xs text-gray-400">
              Invertí más capital para subir el tier de renta diaria. El próximo tier ({nextTier.toLocaleString('es-AR')} MC) te da {nextYield}%/día.
            </p>
            <div className="flex gap-2">
              {[500, 1000, 2500].map((amt) => (
                <button
                  key={amt}
                  onClick={() => setExpandAmount(amt)}
                  className={`flex-1 text-xs py-2 rounded-xl border transition-all ${
                    expandAmount === amt
                      ? 'bg-mango-500 border-mango-500 text-gray-900 font-bold'
                      : 'bg-gray-900 border-gray-700 text-gray-400'
                  }`}
                >
                  +{amt.toLocaleString('es-AR')}
                </button>
              ))}
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              onClick={handleExpand}
              disabled={busy || (profile.mangoCash < expandAmount)}
              className="btn-primary w-full text-sm disabled:opacity-50"
            >
              {busy ? 'Expandiendo…' : profile.mangoCash < expandAmount ? 'Sin fondos' : `Invertir ${expandAmount.toLocaleString('es-AR')} MC`}
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── FOUNDING FLOW ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Fundá tu Empresa</h2>
        <p className="text-xs text-gray-500">Creá tu propio negocio y cobrá renta diaria</p>
      </div>

      <AnimatePresence mode="wait">
        {/* Landing */}
        {step === 'landing' && (
          <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="card bg-gradient-to-br from-mango-900/30 to-gray-900 border-mango-700/50 space-y-3">
              <div className="flex items-center gap-3">
                <Building2 size={32} className="text-mango-400" />
                <div>
                  <p className="font-bold text-mango-400">Tu propia empresa</p>
                  <p className="text-xs text-gray-400">El activo que solo vos manejás</p>
                </div>
              </div>
              <div className="space-y-2 text-xs text-gray-400">
                <p className="flex items-center gap-2"><TrendingUp size={14} className="text-green-400" /> Renta diaria según capital invertido</p>
                <p className="flex items-center gap-2"><Zap size={14} className="text-yellow-400" /> Eventos aleatorios que cambian tu negocio</p>
                <p className="flex items-center gap-2"><ChevronRight size={14} className="text-argentina-blue" /> Expandí y sube de tier para más rentabilidad</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {COMPANY_TYPES.map((t) => (
                <div key={t.id} className="card space-y-1">
                  <span className="text-2xl">{t.icon}</span>
                  <p className="font-bold text-xs">{t.label}</p>
                  <p className="text-xs text-gray-500 leading-tight">{t.description}</p>
                </div>
              ))}
            </div>

            <button onClick={() => setStep('choose_type')} className="btn-primary w-full">
              Empezar a fundar
            </button>
          </motion.div>
        )}

        {/* Choose type */}
        {step === 'choose_type' && (
          <motion.div key="choose_type" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
            <p className="font-bold">¿Qué tipo de empresa querés fundar?</p>
            <div className="space-y-2">
              {COMPANY_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setSelectedType(t); setCompanyName(t.exampleName); setStep('choose_capital') }}
                  className={`w-full text-left card border transition-all hover:border-mango-600 ${
                    selectedType?.id === t.id ? 'border-mango-500' : 'border-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{t.icon}</span>
                    <div>
                      <p className="font-bold text-sm">{t.label}</p>
                      <p className="text-xs text-gray-400">{t.description}</p>
                    </div>
                    <ChevronRight size={16} className="text-gray-500 ml-auto shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Choose capital */}
        {step === 'choose_capital' && selectedType && (
          <motion.div key="choose_capital" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
            <p className="font-bold">¿Cuánto capital inicial invertís?</p>
            <p className="text-xs text-gray-500">Saldo: <span className="text-mango-400 font-bold">${profile.mangoCash.toLocaleString('es-AR')} MC</span></p>
            <div className="space-y-2">
              {CAPITAL_TIERS.map((tier) => {
                const canAfford = profile.mangoCash >= tier.value
                return (
                  <button
                    key={tier.value}
                    onClick={() => canAfford && setSelectedCapital(tier)}
                    disabled={!canAfford}
                    className={`w-full text-left card border transition-all ${
                      !canAfford ? 'opacity-40 cursor-not-allowed border-gray-800' :
                      selectedCapital.value === tier.value ? 'border-mango-500 bg-mango-500/10' : 'border-gray-700 hover:border-mango-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-sm">{tier.label}</p>
                        <p className="text-xs text-gray-400">{tier.description}</p>
                      </div>
                      <p className="font-bold text-green-400 text-sm">{tier.yield}</p>
                    </div>
                  </button>
                )
              })}
            </div>
            <button onClick={() => setStep('name')} className="btn-primary w-full">
              Elegir capital: {selectedCapital.label}
            </button>
          </motion.div>
        )}

        {/* Name */}
        {step === 'name' && selectedType && (
          <motion.div key="name" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
            <p className="font-bold">¿Cómo se llama tu empresa?</p>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              maxLength={40}
              placeholder={selectedType.exampleName}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-mango-500"
            />
            <button
              onClick={() => setStep('confirm')}
              disabled={!companyName.trim()}
              className="btn-primary w-full disabled:opacity-50"
            >
              Continuar
            </button>
          </motion.div>
        )}

        {/* Confirm */}
        {step === 'confirm' && selectedType && (
          <motion.div key="confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <p className="font-bold">Confirmá tu empresa</p>

            <div className="card bg-gradient-to-br from-gray-900 to-mango-900/20 border-mango-700/40 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{selectedType.icon}</span>
                <div>
                  <p className="font-bold text-mango-400">{companyName}</p>
                  <p className="text-xs text-gray-400">{selectedType.label}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-900 rounded-xl p-2">
                  <p className="text-xs text-gray-500">Capital inicial</p>
                  <p className="font-bold text-mango-400">{selectedCapital.label}</p>
                </div>
                <div className="bg-gray-900 rounded-xl p-2">
                  <p className="text-xs text-gray-500">Renta/día</p>
                  <p className="font-bold text-green-400">{selectedCapital.yield}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 bg-yellow-900/20 border border-yellow-700/30 rounded-xl p-3">
                <AlertCircle size={14} className="text-yellow-400 shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-300">
                  Solo podés tener <strong>una empresa propia</strong>. Podés expandirla después con más capital.
                  Ganarás <strong>+20 rep</strong> en el sector {selectedType.label}.
                </p>
              </div>
            </div>

            {error && <p className="text-xs text-red-400 bg-red-400/10 rounded-xl px-3 py-2">{error}</p>}

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setStep('choose_type')} className="btn-secondary">Cambiar</button>
              <button onClick={handleFound} disabled={busy} className="btn-primary disabled:opacity-50">
                {busy ? 'Fundando…' : 'Fundar empresa'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
