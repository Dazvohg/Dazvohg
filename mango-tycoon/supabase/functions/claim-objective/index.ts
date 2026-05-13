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

  const { objectiveId } = await req.json()

  const [{ data: po }, { data: objective }, { data: profile }] = await Promise.all([
    supabase
      .from('player_objectives')
      .select('completed_at')
      .eq('player_id', user.id)
      .eq('objective_id', objectiveId)
      .single(),
    supabase.from('objectives').select('reward').eq('id', objectiveId).single(),
    supabase.from('profiles').select('mango_cash').eq('id', user.id).single(),
  ])

  if (!po || !objective || !profile) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  if ((po as any).completed_at) {
    return new Response(JSON.stringify({ error: 'Already claimed' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const now = new Date().toISOString()
  const newCash = (profile as any).mango_cash + (objective as any).reward

  await Promise.all([
    supabase
      .from('player_objectives')
      .update({ completed_at: now })
      .eq('player_id', user.id)
      .eq('objective_id', objectiveId),
    supabase.from('profiles').update({ mango_cash: newCash }).eq('id', user.id),
  ])

  return new Response(JSON.stringify({ ok: true, newCash, reward: (objective as any).reward }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
