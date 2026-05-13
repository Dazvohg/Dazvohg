import { useState, useEffect } from 'react'
import {
  getDollarRates, getInflation, getRiesgoPais, getPlazoFijo,
  type DolarRate, type InflacionItem, type PlazoFijoItem, type RiesgoPaisItem,
} from '@/lib/api'

export interface ArgMarketData {
  dolar: DolarRate[]
  inflation: InflacionItem[]
  riesgoPais: RiesgoPaisItem[]
  plazoFijo: PlazoFijoItem[]
  loading: boolean
  error: string | null
  lastUpdated: Date | null
  refetch: () => void
}

export function useArgentineData(): ArgMarketData {
  const [dolar, setDolar] = useState<DolarRate[]>([])
  const [inflation, setInflation] = useState<InflacionItem[]>([])
  const [riesgoPais, setRiesgoPais] = useState<RiesgoPaisItem[]>([])
  const [plazoFijo, setPlazoFijo] = useState<PlazoFijoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    async function fetchAll() {
      const [d, inf, rp, pf] = await Promise.allSettled([
        getDollarRates(),
        getInflation(),
        getRiesgoPais(),
        getPlazoFijo(),
      ])
      if (cancelled) return

      if (d.status === 'fulfilled') setDolar(d.value)
      if (inf.status === 'fulfilled') setInflation(inf.value)
      if (rp.status === 'fulfilled') setRiesgoPais(rp.value)
      if (pf.status === 'fulfilled') setPlazoFijo(pf.value)

      const anyFail = [d, inf, rp, pf].some(r => r.status === 'rejected')
      setError(anyFail ? 'Algunos datos no pudieron cargarse' : null)
      setLoading(false)
      setLastUpdated(new Date())
    }

    fetchAll()
    const id = setInterval(fetchAll, 5 * 60 * 1000)
    return () => { cancelled = true; clearInterval(id) }
  }, [tick])

  return { dolar, inflation, riesgoPais, plazoFijo, loading, error, lastUpdated, refetch: () => setTick(t => t + 1) }
}
