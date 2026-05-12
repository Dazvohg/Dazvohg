/**
 * sync-market-data
 *
 * Runs on a schedule (every 30 min via pg_cron or Supabase cron).
 * 1. Fetches dólar blue + oficial from bluelytics.com.ar  (no API key needed)
 * 2. Fetches monthly inflation from argentinadatos.com     (no API key needed)
 * 3. Updates economy_state table
 * 4. Recalculates market_asset prices based on economic changes
 * 5. Logs significant moves as economy_events
 * 6. Records price snapshot in asset_price_history
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,   // service role — can write to all tables
)

// ─── External API helpers ────────────────────────────────────────────────────

interface BluelyticsResponse {
  oficial: { value_buy: number; value_sell: number }
  blue:    { value_buy: number; value_sell: number }
}

async function fetchDolar(): Promise<{ blue: number; oficial: number } | null> {
  try {
    const res = await fetch('https://api.bluelytics.com.ar/v2/latest', {
      headers: { 'Accept': 'application/json' },
    })
    if (!res.ok) return null
    const data: BluelyticsResponse = await res.json()
    return {
      blue:    (data.blue.value_buy    + data.blue.value_sell)    / 2,
      oficial: (data.oficial.value_buy + data.oficial.value_sell) / 2,
    }
  } catch {
    return null
  }
}

interface InflacionRow { fecha: string; valor: number }

async function fetchInflation(): Promise<{ monthly: number; annual: number } | null> {
  try {
    const res = await fetch(
      'https://api.argentinadatos.com/v1/finanzas/indices/inflacion',
      { headers: { 'Accept': 'application/json' } },
    )
    if (!res.ok) return null
    const rows: InflacionRow[] = await res.json()
    if (!rows.length) return null

    // Last 12 months
    const sorted = rows.sort((a, b) => b.fecha.localeCompare(a.fecha))
    const monthly = sorted[0].valor
    const annual  = sorted.slice(0, 12).reduce((acc, r) => acc * (1 + r.valor / 100), 1) * 100 - 100

    return { monthly, annual }
  } catch {
    return null
  }
}

// ─── Price adjustment logic ──────────────────────────────────────────────────

interface AssetRow {
  id: string
  type: string
  price: number
}

/**
 * Recalculate a market asset's price based on live economic data.
 *
 * Rules:
 *  - Bonds:       follow dolar blue (denominated in USD in practice)
 *  - Real estate: follow dolar blue + small inflation premium
 *  - Companies:   moderate correlation with blue, dampened
 *  - Clubs:       least correlated, slow moving
 */
function adjustedPrice(
  asset: AssetRow,
  prevBlue: number,
  newBlue: number,
  monthlyInflation: number,
): number {
  const blueChangePct = prevBlue > 0 ? (newBlue - prevBlue) / prevBlue : 0
  const inflationFactor = 1 + monthlyInflation / 100 / 30  // daily portion

  let multiplier = 1

  switch (asset.type) {
    case 'bond':
      // Bonds: strong correlation with blue (dollar-linked)
      multiplier = 1 + blueChangePct * 0.85 * inflationFactor
      break
    case 'real_estate':
      // Real estate: priced in USD, so directly linked to blue
      multiplier = 1 + blueChangePct * 1.0 * inflationFactor
      break
    case 'company':
      // Companies: partial correlation, can benefit from inflation (revenue goes up)
      multiplier = 1 + blueChangePct * 0.5 + (monthlyInflation / 100 / 30) * 0.3
      break
    case 'club':
      // Clubs: weakest correlation, driven by sporting results (see sync-football)
      multiplier = 1 + blueChangePct * 0.2
      break
  }

  // Clamp to ±5% per sync cycle to avoid runaway prices
  const clampedMultiplier = Math.max(0.95, Math.min(1.05, multiplier))
  return Math.round(asset.price * clampedMultiplier)
}

// ─── Economy event generation ────────────────────────────────────────────────

function buildEconomyEvent(
  blueChangePct: number,
  monthlyInflation: number,
): { type: string; title: string; description: string; impact: object } | null {
  const abs = Math.abs(blueChangePct * 100)

  if (blueChangePct > 0.03) {
    return {
      type: 'dolar_blue',
      title: `⚡ Dólar Blue +${(blueChangePct * 100).toFixed(1)}%`,
      description: `El blue trepó a $${Math.round(0)} en el mercado informal. La brecha con el oficial se amplía.`,
      impact: { dolarBlueDelta: +(blueChangePct * 100).toFixed(1), bondYieldDelta: 0.5 },
    }
  }
  if (blueChangePct < -0.03) {
    return {
      type: 'boom',
      title: `📉 Dólar Blue −${abs.toFixed(1)}%`,
      description: 'La brecha cambiaria se achica. Señales positivas en el mercado.',
      impact: { dolarBlueDelta: +(blueChangePct * 100).toFixed(1), companyMultiplier: 1.05 },
    }
  }
  if (monthlyInflation > 10) {
    return {
      type: 'inflation',
      title: `💸 Inflación Mensual: ${monthlyInflation.toFixed(1)}%`,
      description: 'El IPC sigue presionando. Los activos reales se revalorizan.',
      impact: { realEstateMultiplier: 1.08, bondYieldDelta: 0.5 },
    }
  }
  return null
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // Allow both scheduled (no auth) and manual (with service key) calls
  const isScheduled = req.headers.get('x-scheduled') === 'true'
  if (!isScheduled) {
    const auth = req.headers.get('Authorization')
    if (auth !== `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`) {
      return new Response('Unauthorized', { status: 401 })
    }
  }

  // 1. Fetch external data
  const [dolar, inflation] = await Promise.all([fetchDolar(), fetchInflation()])

  if (!dolar) {
    return new Response(JSON.stringify({ error: 'Could not fetch dolar data' }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const monthly = inflation?.monthly ?? 8.5
  const annual  = inflation?.annual  ?? 120

  // 2. Read current economy_state to get previous blue value
  const { data: prevState } = await supabase
    .from('economy_state')
    .select('dolar_blue, dolar_oficial')
    .eq('id', 1)
    .single()

  const prevBlue = (prevState as any)?.dolar_blue ?? dolar.blue

  // 3. Update economy_state
  await supabase.from('economy_state').upsert({
    id: 1,
    dolar_blue:       dolar.blue,
    dolar_oficial:    dolar.oficial,
    dolar_blue_prev:  prevBlue,
    inflation_monthly: monthly,
    inflation_annual:  annual,
    updated_at:       new Date().toISOString(),
  })

  // 4. Load all assets and recalculate prices
  const { data: assets } = await supabase
    .from('market_assets')
    .select('id, type, price')

  if (!assets) {
    return new Response(JSON.stringify({ error: 'No assets found' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const updates: { id: string; price: number }[] = []
  const historyRows: { asset_id: string; price: number }[] = []

  for (const asset of assets as AssetRow[]) {
    const newPrice = adjustedPrice(asset, prevBlue, dolar.blue, monthly)
    if (newPrice !== asset.price) {
      updates.push({ id: asset.id, price: newPrice })
    }
    historyRows.push({ asset_id: asset.id, price: newPrice })
  }

  // 5. Apply price updates (one upsert per asset — Supabase doesn't support bulk update with different values)
  await Promise.all(
    updates.map((u) =>
      supabase.from('market_assets').update({ price: u.price }).eq('id', u.id),
    ),
  )

  // 6. Record price history snapshot
  if (historyRows.length > 0) {
    await supabase.from('asset_price_history').insert(historyRows)
  }

  // 7. Maybe create an economy event
  const blueChangePct = prevBlue > 0 ? (dolar.blue - prevBlue) / prevBlue : 0
  const event = buildEconomyEvent(blueChangePct, monthly)

  if (event) {
    const now = new Date()
    const activeTo = new Date(now.getTime() + 6 * 60 * 60 * 1000) // 6 hours
    await supabase.from('economy_events').insert({
      type:        event.type,
      title:       event.title.replace('$0', `$${Math.round(dolar.blue)}`),
      description: event.description,
      impact:      event.impact,
      active_from: now.toISOString(),
      active_to:   activeTo.toISOString(),
    })
  }

  return new Response(
    JSON.stringify({
      ok: true,
      dolar_blue:        dolar.blue,
      dolar_oficial:     dolar.oficial,
      inflation_monthly: monthly,
      assets_updated:    updates.length,
      event_created:     !!event,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
