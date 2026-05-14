import { useGameStore } from '../../game/store/gameStore'
import ObjectiveCard from '../../game/components/ObjectiveCard'
import type { ObjectiveCategory } from '../../types/game'

const CATEGORY_LABEL: Record<ObjectiveCategory, string> = {
  investment:  '💼 Inversiones',
  trading:     '💰 Ahorro y Trading',
  level:       '⭐ Subir de Nivel',
  portfolio:   '📊 Patrimonio',
  regional:    '🗺️ Regional',
  reputation:  '🏅 Reputación',
}

export default function Objectives() {
  const { playerObjectives } = useGameStore()

  const pending   = playerObjectives.filter((po) => !po.completedAt)
  const completed = playerObjectives.filter((po) => !!po.completedAt)

  const grouped = pending.reduce<Partial<Record<ObjectiveCategory, typeof pending>>>((acc, po) => {
    const cat = po.objective.category as ObjectiveCategory
    if (!acc[cat]) acc[cat] = []
    acc[cat]!.push(po)
    return acc
  }, {})

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Objetivos</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          {completed.length} / {playerObjectives.length} completados
        </p>
      </div>

      {(Object.entries(CATEGORY_LABEL) as [ObjectiveCategory, string][]).map(([cat, label]) => {
        const items = grouped[cat]
        if (!items || items.length === 0) return null
        return (
          <section key={cat} className="space-y-2">
            <p className="text-sm font-semibold text-gray-300">{label}</p>
            {items.map((po) => <ObjectiveCard key={po.objectiveId} po={po} />)}
          </section>
        )
      })}

      {completed.length > 0 && (
        <section className="space-y-2">
          <p className="text-sm font-semibold text-gray-600">✅ Completados</p>
          {completed.map((po) => <ObjectiveCard key={po.objectiveId} po={po} />)}
        </section>
      )}
    </div>
  )
}
