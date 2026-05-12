/**
 * sync-football
 *
 * Runs daily via pg_cron.
 * 1. Fetches recent Liga Profesional Argentina (BSA) matches from football-data.org
 *    Free tier: 10 req/min, no cost. Needs FOOTBALL_API_KEY secret in Supabase.
 *    Sign up at: https://www.football-data.org/client/register
 * 2. For each finished match, adjusts the winning/losing club's price in market_assets
 * 3. Marks match as processed so it's not applied twice
 * 4. Creates an economy_event if a "big" match (Superclásico, title decider, etc.)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

// Map football-data.org team names → our asset IDs
const TEAM_TO_ASSET: Record<string, string> = {
  'Boca Juniors':        'boca',
  'River Plate':         'river',
  'Racing Club':         'racing',
  'San Lorenzo':         'san_lorenzo',
  'Talleres de Córdoba': 'talleres',
  'Talleres':            'talleres',
}

// Liga Profesional Argentina competition code in football-data.org
const COMPETITION = 'BSA'

interface FDMatch {
  id: number
  utcDate: string
  status: string           // FINISHED | SCHEDULED | IN_PLAY | etc.
  homeTeam: { name: string }
  awayTeam: { name: string }
  score: {
    winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null
    fullTime: { home: number | null; away: number | null }
  }
}

async function fetchRecentMatches(): Promise<FDMatch[]> {
  const apiKey = Deno.env.get('FOOTBALL_API_KEY')
  if (!apiKey) {
    console.warn('FOOTBALL_API_KEY not set — skipping football sync')
    return []
  }

  // Last 3 days
  const dateTo   = new Date()
  const dateFrom = new Date(dateTo.getTime() - 3 * 24 * 60 * 60 * 1000)
  const fmt = (d: Date) => d.toISOString().split('T')[0]

  try {
    const res = await fetch(
      `https://api.football-data.org/v4/competitions/${COMPETITION}/matches?dateFrom=${fmt(dateFrom)}&dateTo=${fmt(dateTo)}&status=FINISHED`,
      { headers: { 'X-Auth-Token': apiKey } },
    )
    if (!res.ok) {
      console.error('football-data.org error', res.status, await res.text())
      return []
    }
    const data = await res.json()
    return (data.matches ?? []) as FDMatch[]
  } catch (e) {
    console.error('fetchRecentMatches error', e)
    return []
  }
}

function isPriceMovementWorthy(match: FDMatch): boolean {
  const home = match.homeTeam.name
  const away = match.awayTeam.name
  return TEAM_TO_ASSET[home] !== undefined || TEAM_TO_ASSET[away] !== undefined
}

function isSuperclasico(match: FDMatch): boolean {
  const teams = [match.homeTeam.name, match.awayTeam.name]
  return teams.includes('Boca Juniors') && teams.includes('River Plate')
}

/**
 * Price change per match result:
 *  WIN  → +2–4%
 *  DRAW → ±0.5%
 *  LOSS → −1.5–3%
 *  Superclásico multiplies the effect
 */
function priceImpact(
  result: 'win' | 'draw' | 'loss',
  isBigMatch: boolean,
): number {
  const base = result === 'win' ? 0.03 : result === 'draw' ? 0.005 : -0.025
  return base * (isBigMatch ? 2 : 1)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const matches = await fetchRecentMatches()
  const processed: number[] = []
  const skipped:   number[] = []

  for (const match of matches) {
    if (!isPriceMovementWorthy(match)) continue
    if (match.score.winner === null) continue

    // Check if already processed
    const { data: existing } = await supabase
      .from('football_results')
      .select('id')
      .eq('match_id', match.id)
      .maybeSingle()

    if (existing) { skipped.push(match.id); continue }

    const bigMatch = isSuperclasico(match)

    // Determine result for each team
    const teamResults: { assetId: string; result: 'win' | 'draw' | 'loss' }[] = []

    for (const [teamName, side] of [
      [match.homeTeam.name, 'home'],
      [match.awayTeam.name, 'away'],
    ] as [string, 'home' | 'away'][]) {
      const assetId = TEAM_TO_ASSET[teamName]
      if (!assetId) continue

      let result: 'win' | 'draw' | 'loss'
      if (match.score.winner === 'DRAW') {
        result = 'draw'
      } else if (
        (match.score.winner === 'HOME_TEAM' && side === 'home') ||
        (match.score.winner === 'AWAY_TEAM' && side === 'away')
      ) {
        result = 'win'
      } else {
        result = 'loss'
      }
      teamResults.push({ assetId, result })
    }

    // Apply price changes
    for (const { assetId, result } of teamResults) {
      const { data: asset } = await supabase
        .from('market_assets')
        .select('price')
        .eq('id', assetId)
        .single()

      if (!asset) continue

      const delta = priceImpact(result, bigMatch)
      const newPrice = Math.round((asset as any).price * (1 + delta))

      await supabase.from('market_assets').update({ price: newPrice }).eq('id', assetId)
      await supabase.from('asset_price_history').insert({ asset_id: assetId, price: newPrice })
    }

    // Log the result
    await supabase.from('football_results').insert({
      match_id:     match.id,
      home_team:    match.homeTeam.name,
      away_team:    match.awayTeam.name,
      home_score:   match.score.fullTime.home,
      away_score:   match.score.fullTime.away,
      status:       match.status,
      match_date:   match.utcDate,
      processed_at: new Date().toISOString(),
    })

    // Superclásico event
    if (bigMatch) {
      const winner =
        match.score.winner === 'HOME_TEAM' ? match.homeTeam.name
        : match.score.winner === 'AWAY_TEAM' ? match.awayTeam.name
        : null

      const title = winner
        ? `🏆 Superclásico: Ganó ${winner}`
        : '🏆 Superclásico: Empate'

      const now     = new Date()
      const activeTo = new Date(now.getTime() + 12 * 60 * 60 * 1000)
      await supabase.from('economy_events').insert({
        type:        'boom',
        title,
        description: `Boca vs River. ${match.score.fullTime.home ?? 0}−${match.score.fullTime.away ?? 0}. Los clubes se mueven.`,
        impact:      { clubMultiplier: winner ? 1.15 : 1.05 },
        active_from: now.toISOString(),
        active_to:   activeTo.toISOString(),
      })
    }

    processed.push(match.id)
  }

  return new Response(
    JSON.stringify({ ok: true, processed: processed.length, skipped: skipped.length }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
