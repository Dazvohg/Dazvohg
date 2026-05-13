import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

interface SeasonBonus { assetType: string; multiplier: number; label: string }
interface Season {
  season: string; label: string; icon: string; description: string
  bonuses: SeasonBonus[]; activeMonths: number[]
}

const SEASONS: Season[] = [
  {
    season: 'fiestas',
    label: 'Fiestas y Fin de Año',
    icon: '🎉',
    description: 'Diciembre: el rally fin de año, consumo en máximos e inyección de aguinaldos.',
    activeMonths: [11],
    bonuses: [
      { assetType: 'company',     multiplier: 1.25, label: '+25% empresas' },
      { assetType: 'tourism',     multiplier: 1.3,  label: '+30% turismo' },
      { assetType: 'bond',        multiplier: 0.95, label: '−5% bonos' },
    ],
  },
  {
    season: 'verano',
    label: 'Verano Argentino',
    icon: '☀️',
    description: 'Temporada alta de turismo y consumo. Las costas y Bariloche atraen millones.',
    activeMonths: [0, 1],
    bonuses: [
      { assetType: 'tourism',     multiplier: 1.4,  label: '+40% turismo' },
      { assetType: 'real_estate', multiplier: 1.15, label: '+15% inmuebles' },
      { assetType: 'company',     multiplier: 1.1,  label: '+10% empresas' },
    ],
  },
  {
    season: 'cosecha',
    label: 'Cosecha Grande',
    icon: '🌾',
    description: 'Marzo–mayo: soja y Malbec en su punto máximo. Los dólares del campo entran.',
    activeMonths: [2, 3, 4],
    bonuses: [
      { assetType: 'agriculture', multiplier: 1.35, label: '+35% agro' },
      { assetType: 'real_estate', multiplier: 1.1,  label: '+10% inmuebles' },
      { assetType: 'bond',        multiplier: 1.05, label: '+5% bonos' },
    ],
  },
  {
    season: 'invierno',
    label: 'Copa Libertadores',
    icon: '⚽',
    description: 'Invierno: fútbol sudamericano, nieve en la Patagonia, demanda energética alta.',
    activeMonths: [5, 6, 7],
    bonuses: [
      { assetType: 'club',        multiplier: 1.3,  label: '+30% clubes' },
      { assetType: 'tourism',     multiplier: 1.2,  label: '+20% nieve Bariloche' },
      { assetType: 'energy',      multiplier: 1.1,  label: '+10% energía' },
    ],
  },
  {
    season: 'primavera',
    label: 'Reactivación Primaveral',
    icon: '🌸',
    description: 'El campo florece, los negocios se reactivan y las obras aceleran.',
    activeMonths: [8, 9, 10],
    bonuses: [
      { assetType: 'real_estate', multiplier: 1.2,  label: '+20% inmuebles' },
      { assetType: 'company',     multiplier: 1.12, label: '+12% empresas' },
      { assetType: 'agriculture', multiplier: 1.08, label: '+8% agro (siembra)' },
    ],
  },
]

// Company random events (localized Argentine flavor)
const COMPANY_EVENTS = [
  { desc: 'Conseguiste un contrato con el Estado. ¡Licitación ganada!', delta: 500 },
  { desc: 'Una nota en el diario Clarín duplicó tus consultas.', delta: 300 },
  { desc: 'El tipo de cambio jugó a tu favor: clientes extranjeros pagan más.', delta: 400 },
  { desc: 'Una huelga de empleados frenó la producción 2 días.', delta: -200 },
  { desc: 'El corte de luz de 6 horas dañó equipos. Costo de reparación.', delta: -150 },
  { desc: 'Un inversor ángel mostró interés. Valuación al alza.', delta: 600 },
  { desc: 'Aumento del 30% en servicios públicos impactó tus costos.', delta: -250 },
  { desc: 'Tu producto fue mencionado en un podcast con 200k oyentes.', delta: 350 },
  { desc: 'Llegó el aguinaldo: tus empleados están motivados. Productividad récord.', delta: 280 },
  { desc: 'El cepo cambiario complica importar insumos. Demoras en producción.', delta: -180 },
  { desc: 'Ganaste un premio PyME del ministerio. Visibilidad extra.', delta: 200 },
  { desc: 'Un cliente grande canceló por recesión. Perdiste facturación.', delta: -300 },
]

Deno.serve(async (req) => {
  try {
    const month = new Date().getMonth()

    // Determine active season
    let activeSeason = SEASONS[1]  // default verano
    for (const s of SEASONS) {
      if (s.activeMonths.includes(month)) {
        activeSeason = s
        break
      }
    }

    // Update seasonal_state
    await supabase.from('seasonal_state').upsert({
      id: 1,
      season: activeSeason.season,
      label: activeSeason.label,
      icon: activeSeason.icon,
      description: activeSeason.description,
      active_bonuses: activeSeason.bonuses,
      updated_at: new Date().toISOString(),
    })

    // Trigger company random events for players with companies not updated in >20 hours
    const cutoff = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString()
    const { data: companies } = await supabase
      .from('own_companies')
      .select('id, player_id, capital_invested')
      .or(`last_event_at.is.null,last_event_at.lt.${cutoff}`)

    if (companies && companies.length > 0) {
      for (const company of companies) {
        const event = COMPANY_EVENTS[Math.floor(Math.random() * COMPANY_EVENTS.length)]
        const scaledDelta = Math.round(event.delta * (1 + company.capital_invested / 10000))

        await supabase.from('own_companies').update({
          last_event_at:   new Date().toISOString(),
          last_event_desc: event.desc,
          last_event_delta: scaledDelta,
        }).eq('id', company.id)

        // Apply cash delta to player profile
        if (scaledDelta !== 0) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('mango_cash')
            .eq('id', company.player_id)
            .single()
          if (profile) {
            await supabase.from('profiles').update({
              mango_cash: Math.max(0, (profile as any).mango_cash + scaledDelta),
            }).eq('id', company.player_id)
          }
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, season: activeSeason.season }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
