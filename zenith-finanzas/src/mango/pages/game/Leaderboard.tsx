import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useGameStore } from '../../game/store/gameStore'

interface Row {
  username: string
  mango_cash: number
  level: number
}

const MEDAL = ['🥇', '🥈', '🥉']

export default function Leaderboard() {
  const { profile, ownedAssets } = useGameStore()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('username, mango_cash, level')
      .order('mango_cash', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data) setRows(data as Row[])
        setLoading(false)
      })
  }, [])

  const myNetWorth =
    (profile?.mangoCash ?? 0) + ownedAssets.reduce((s, oa) => s + oa.asset.price * oa.quantity, 0)

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Ranking</h2>

      {/* My stats */}
      {profile && (
        <div className="card border-mango-700/50 bg-mango-900/10">
          <p className="text-xs text-gray-400 mb-1">Tu patrimonio neto estimado</p>
          <p className="text-xl font-bold text-mango-400">
            ${myNetWorth.toLocaleString('es-AR')} MC
          </p>
        </div>
      )}

      {loading ? (
        <p className="text-center text-gray-500 py-8 animate-pulse">Cargando ranking…</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row, i) => {
            const isMe = row.username === profile?.username
            return (
              <div
                key={row.username}
                className={`card flex items-center gap-3 ${
                  isMe ? 'border-mango-600 bg-mango-900/20' : ''
                }`}
              >
                <div className="w-7 text-center font-bold text-sm shrink-0">
                  {MEDAL[i] ?? <span className="text-gray-500 text-xs">#{i + 1}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold truncate ${isMe ? 'text-mango-400' : ''}`}>
                    {row.username}{isMe ? ' (vos)' : ''}
                  </p>
                  <p className="text-xs text-gray-500">Nivel {row.level}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-mango-400 tabular-nums">
                    ${row.mango_cash.toLocaleString('es-AR')}
                  </p>
                  <p className="text-xs text-gray-500">MC</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
