import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface EconomyState {
  dolar_blue:       number
  dolar_oficial:    number
  dolar_blue_prev:  number
  inflation_monthly: number
  inflation_annual:  number
  updated_at:       string
}

function Delta({ current, prev }: { current: number; prev: number }) {
  const pct = prev > 0 ? ((current - prev) / prev) * 100 : 0
  const abs = Math.abs(pct)

  if (abs < 0.05) return <Minus size={12} className="text-gray-500" />
  if (pct > 0)    return (
    <span className="flex items-center gap-0.5 text-red-400 text-xs">
      <TrendingUp size={11} />+{abs.toFixed(1)}%
    </span>
  )
  return (
    <span className="flex items-center gap-0.5 text-green-400 text-xs">
      <TrendingDown size={11} />−{abs.toFixed(1)}%
    </span>
  )
}

export default function EconomyTicker() {
  const [economy, setEconomy] = useState<EconomyState | null>(null)
  const [visible, setVisible] = useState(0)   // rotating indicator

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('economy_state')
        .select('*')
        .eq('id', 1)
        .single()
      if (data) setEconomy(data as EconomyState)
    }

    load()

    // Refresh every 5 minutes
    const interval = setInterval(load, 5 * 60 * 1000)

    // Real-time subscription
    const channel = supabase
      .channel('economy_state')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'economy_state' },
        (payload) => setEconomy(payload.new as EconomyState),
      )
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [])

  // Rotate visible indicator every 4s
  useEffect(() => {
    const t = setInterval(() => setVisible((v) => (v + 1) % 3), 4000)
    return () => clearInterval(t)
  }, [])

  if (!economy) return null

  const brecha = economy.dolar_oficial > 0
    ? (((economy.dolar_blue - economy.dolar_oficial) / economy.dolar_oficial) * 100).toFixed(0)
    : '—'

  const indicators = [
    {
      label: '💵 Blue',
      value: `$${Math.round(economy.dolar_blue).toLocaleString('es-AR')}`,
      delta: <Delta current={economy.dolar_blue} prev={economy.dolar_blue_prev} />,
    },
    {
      label: '📊 Brecha',
      value: `${brecha}%`,
      delta: null,
    },
    {
      label: '📈 Inflación',
      value: `${economy.inflation_monthly.toFixed(1)}% men.`,
      delta: null,
    },
  ]

  return (
    <div className="overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={visible}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-2 bg-gray-900/60 border border-gray-800 rounded-xl px-3 py-2 mb-4"
        >
          <span className="text-xs text-gray-500 shrink-0">{indicators[visible].label}</span>
          <span className="text-xs font-bold text-white">{indicators[visible].value}</span>
          {indicators[visible].delta}
          <span className="ml-auto text-xs text-gray-600">
            {new Date(economy.updated_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
