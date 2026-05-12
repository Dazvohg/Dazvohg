import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const MS_PER_HOUR = 1_000 * 60 * 60

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401 })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const [{ data: profile }, { data: assets }] = await Promise.all([
    supabase.from('profiles').select('mango_cash, last_login').eq('id', user.id).single(),
    supabase
      .from('player_assets')
      .select('bought_at, quantity, asset:market_assets(yield_rate)')
      .eq('player_id', user.id),
  ])

  if (!profile) return new Response('Profile not found', { status: 404 })

  const now = Date.now()
  const last = new Date((profile as any).last_login).getTime()
  const hoursElapsed = Math.min((now - last) / MS_PER_HOUR, 72)

  let income = 0
  for (const row of (assets as any[]) ?? []) {
    const hourlyYield = row.asset.yield_rate / 100 / 24
    income += Math.floor(row.bought_at * row.quantity * hourlyYield * hoursElapsed)
  }

  if (income > 0) {
    await supabase
      .from('profiles')
      .update({
        mango_cash: (profile as any).mango_cash + income,
        last_login: new Date().toISOString(),
      })
      .eq('id', user.id)
  }

  return new Response(JSON.stringify({ income }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
