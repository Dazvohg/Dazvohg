import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { OwnedAsset } from '../../types/game'

const TYPE_COLOR: Record<string, string> = {
  company:      '#74ACDF',
  real_estate:  '#f59e0b',
  bond:         '#10b981',
  club:         '#8b5cf6',
}
const TYPE_LABEL: Record<string, string> = {
  company: 'Empresas', real_estate: 'Inmuebles', bond: 'Bonos', club: 'Clubes',
}

export default function PortfolioChart({ ownedAssets }: { ownedAssets: OwnedAsset[] }) {
  const data = Object.entries(
    ownedAssets.reduce<Record<string, number>>((acc, oa) => {
      acc[oa.asset.type] = (acc[oa.asset.type] ?? 0) + oa.asset.price * oa.quantity
      return acc
    }, {}),
  ).map(([type, value]) => ({ name: TYPE_LABEL[type] ?? type, value, type }))

  if (data.length === 0) return null

  return (
    <div className="card">
      <p className="text-sm font-bold mb-3">Distribución del Portfolio</p>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={48} outerRadius={78} dataKey="value" paddingAngle={2}>
            {data.map((entry, i) => (
              <Cell key={i} fill={TYPE_COLOR[entry.type] ?? '#6b7280'} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v: number) => [`$${v.toLocaleString('es-AR')} MC`, '']}
            contentStyle={{
              background: '#111827',
              border: '1px solid #374151',
              borderRadius: '12px',
              fontSize: '12px',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-3 mt-1">
        {data.map((entry) => (
          <div key={entry.type} className="flex items-center gap-1.5 text-xs">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: TYPE_COLOR[entry.type] }} />
            <span className="text-gray-400">{entry.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
