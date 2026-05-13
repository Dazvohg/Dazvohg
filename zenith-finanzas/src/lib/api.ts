export interface DolarRate {
  casa: string
  nombre: string
  compra: number | null
  venta: number | null
  fechaActualizacion?: string
}

export interface InflacionItem {
  fecha: string
  valor: number
}

export interface PlazoFijoItem {
  entidad: string
  tnaClientes: number
  tnaNuevosClientes: number
}

export interface RiesgoPaisItem {
  fecha: string
  valor: number
}

const DOLAR_URL = 'https://dolarapi.com/v1/dolares'
const ARG_BASE = 'https://api.argentinadatos.com/v1'
const GKO_BASE = 'https://api.coingecko.com/api/v3'

export async function getDollarRates(): Promise<DolarRate[]> {
  const r = await fetch(DOLAR_URL)
  if (!r.ok) throw new Error('dolar api')
  return r.json()
}

export async function getInflation(): Promise<InflacionItem[]> {
  const r = await fetch(`${ARG_BASE}/finanzas/indices/inflacion`)
  if (!r.ok) throw new Error('inflacion api')
  return r.json()
}

export async function getRiesgoPais(): Promise<RiesgoPaisItem[]> {
  const r = await fetch(`${ARG_BASE}/finanzas/indices/riesgo-pais`)
  if (!r.ok) throw new Error('riesgo pais api')
  return r.json()
}

export async function getPlazoFijo(): Promise<PlazoFijoItem[]> {
  const r = await fetch(`${ARG_BASE}/finanzas/tasas/plazoFijo`)
  if (!r.ok) throw new Error('plazo fijo api')
  return r.json()
}

export async function getCryptoPrices(ids: string[]): Promise<Record<string, { usd: number; usd_24h_change: number }>> {
  const r = await fetch(
    `${GKO_BASE}/simple/price?ids=${ids.join(',')}&vs_currencies=usd&include_24hr_change=true`
  )
  if (!r.ok) throw new Error('coingecko api')
  return r.json()
}
