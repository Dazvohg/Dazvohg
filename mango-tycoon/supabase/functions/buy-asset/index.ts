import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

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

  const { assetId } = await req.json()

  const [{ data: profile }, { data: asset }] = await Promise.all([
    supabase.from('profiles').select('mango_cash, total_invested').eq('id', user.id).single(),
    supabase.from('market_assets').select('price').eq('id', assetId).single(),
  ])

  if (!profile || !asset) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if ((profile as any).mango_cash < (asset as any).price) {
    return new Response(JSON.stringify({ error: 'Insufficient Mango Cash' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const newCash     = (profile as any).mango_cash - (asset as any).price
  const newInvested = (profile as any).total_invested + (asset as any).price

  const { data: existing } = await supabase
    .from('player_assets')
    .select('id, quantity')
    .eq('player_id', user.id)
    .eq('asset_id', assetId)
    .maybeSingle()

  await Promise.all([
    supabase
      .from('profiles')
      .update({ mango_cash: newCash, total_invested: newInvested })
      .eq('id', user.id),
    existing
      ? supabase
          .from('player_assets')
          .update({ quantity: (existing as any).quantity + 1 })
          .eq('id', (existing as any).id)
      : supabase.from('player_assets').insert({
          player_id: user.id,
          asset_id: assetId,
          bought_at: (asset as any).price,
          quantity: 1,
        }),
  ])

  return new Response(JSON.stringify({ ok: true, newCash }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
