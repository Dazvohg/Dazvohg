import { useMemo, useState, useEffect, useRef } from 'react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, CartesianGrid,
} from 'recharts'
import { generateCandles } from '@/data/market'

interface Props {
  symbol: string
  basePrice: number
  color?: string
  height?: number
  showAxes?: boolean
}

type ChartPoint = { time: number; price: number; open: number }

// Carga 80 velas reales de Binance y las mantiene actualizadas via WS
function useBtcLiveCandles(): ChartPoint[] {
  const [candles, setCandles] = useState<ChartPoint[]>([])
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    let dead = false

    fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=80', {
      signal: AbortSignal.timeout(8000),
    })
      .then(r => r.json())
      .then((rows: number[][]) => {
        if (dead) return
        setCandles(rows.map(([t, o, , , c]) => ({ time: t, price: Number(c), open: Number(o) })))
      })
      .catch(() => {})

    function connect() {
      if (dead) return
      const ws = new WebSocket('wss://stream.binance.com/ws/btcusdt@kline_1m')
      wsRef.current = ws
      ws.onmessage = ({ data }) => {
        try {
          const { k } = JSON.parse(data)
          const point: ChartPoint = { time: k.t, price: Number(k.c), open: Number(k.o) }
          setCandles(prev => {
            if (!prev.length) return [point]
            const last = prev[prev.length - 1]
            // misma vela: actualizar; vela nueva: agregar
            return last.time === k.t
              ? [...prev.slice(0, -1), point]
              : [...prev.slice(-79), point]
          })
        } catch {}
      }
      ws.onclose = () => { if (!dead) setTimeout(connect, 3000) }
    }
    connect()

    return () => { dead = true; wsRef.current?.close() }
  }, [])

  return candles
}

function formatTime(ms: number) {
  return new Date(ms).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

export default function PriceChart({ symbol, basePrice, height = 200, showAxes = true }: Props) {
  const btcCandles = useBtcLiveCandles()

  const generatedData = useMemo(() =>
    generateCandles(basePrice, 80).map(c => ({
      time: c.time,
      price: +c.close.toFixed(2),
      open:  +c.open.toFixed(2),
    })),
    [basePrice]
  )

  const data: ChartPoint[] =
    symbol === 'BTC' && btcCandles.length > 0 ? btcCandles : generatedData

  const isUp = data.length > 1
    ? data[data.length - 1].price >= data[0].price
    : true
  const lineColor = isUp ? '#00BA7C' : '#F4212E'
  const gradientId = `grad-${symbol}`

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: showAxes ? 50 : 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity={0.25} />
            <stop offset="100%" stopColor={lineColor} stopOpacity={0.01} />
          </linearGradient>
        </defs>

        {showAxes && <CartesianGrid strokeDasharray="3 3" stroke="#2F3336" vertical={false} />}
        {showAxes && (
          <XAxis
            dataKey="time"
            tickFormatter={formatTime}
            tick={{ fill: '#71767B', fontSize: 10, fontFamily: 'ui-monospace, monospace' }}
            axisLine={false}
            tickLine={false}
            minTickGap={50}
          />
        )}
        {showAxes && (
          <YAxis
            domain={['auto', 'auto']}
            tick={{ fill: '#71767B', fontSize: 10, fontFamily: 'ui-monospace, monospace' }}
            axisLine={false}
            tickLine={false}
            width={48}
            tickFormatter={v =>
              symbol === 'MERVAL'
                ? `${(v / 1000).toFixed(0)}K`
                : symbol === 'BTC'
                ? `$${Math.round(v).toLocaleString('en-US')}`
                : `$${Number(v).toFixed(2)}`
            }
          />
        )}

        <Tooltip
          contentStyle={{
            background: '#16181C',
            border: '1px solid #2F3336',
            borderRadius: '8px',
            fontSize: '12px',
            fontFamily: 'ui-monospace, monospace',
          }}
          labelStyle={{ color: '#71767B' }}
          itemStyle={{ color: lineColor }}
          labelFormatter={v => formatTime(v as number)}
          formatter={v => [
            symbol === 'MERVAL'
              ? Number(v).toLocaleString('es-AR')
              : symbol === 'BTC'
              ? `$${Math.round(Number(v)).toLocaleString('en-US')}`
              : `$${Number(v).toFixed(2)}`,
            'Precio',
          ]}
        />

        <Area
          type="monotone"
          dataKey="price"
          stroke={lineColor}
          strokeWidth={1.5}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 3, fill: lineColor, stroke: '#16181C', strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
