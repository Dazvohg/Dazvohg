import { useMemo } from 'react'
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

function formatTime(ms: number) {
  return new Date(ms).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

export default function PriceChart({ symbol, basePrice, color = '#1D9BF0', height = 200, showAxes = true }: Props) {
  const data = useMemo(() =>
    generateCandles(basePrice, 80).map(c => ({
      time: c.time,
      price: +c.close.toFixed(2),
      open: +c.open.toFixed(2),
    })),
    [basePrice]
  )

  const isUp = data[data.length - 1].price >= data[0].price
  const lineColor = isUp ? '#1D9BF0' : '#ef4444'
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

        {showAxes && (
          <CartesianGrid strokeDasharray="3 3" stroke="#2F3336" vertical={false} />
        )}

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
            tickFormatter={v => symbol === 'MERVAL' ? `${(v/1000).toFixed(0)}K` : `$${v.toFixed(2)}`}
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
              ? `${Number(v).toLocaleString('es-AR')}`
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
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
