import { useState, useEffect, useRef } from 'react'
import { INSTRUMENTS } from '@/data/market'

export type LivePriceMap = Record<string, { price: number; changePct: number; change: number }>

// BTC: Binance WebSocket (actualización cada ~1s, sin API key)
// Resto: valores base de INSTRUMENTS mientras no haya fuente live
export function useLivePrices(): { prices: LivePriceMap; btcLive: boolean } {
  const [prices, setPrices] = useState<LivePriceMap>(() =>
    Object.fromEntries(
      INSTRUMENTS.map(i => [i.symbol, { price: i.price, changePct: i.changePct, change: i.change }])
    )
  )
  const [btcLive, setBtcLive] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    let dead = false

    function connect() {
      if (dead) return
      // @ticker da precio actual + cambio 24h sin suscribirse a candles
      const ws = new WebSocket('wss://stream.binance.com/ws/btcusdt@ticker')
      wsRef.current = ws

      ws.onopen  = () => { if (!dead) setBtcLive(true) }
      ws.onclose = () => {
        setBtcLive(false)
        if (!dead) setTimeout(connect, 3000)
      }
      ws.onmessage = ({ data }) => {
        try {
          const msg = JSON.parse(data)
          setPrices(prev => ({
            ...prev,
            BTC: {
              price:     Number(msg.c),   // último precio
              changePct: Number(msg.P),   // % cambio 24h
              change:    Number(msg.p),   // cambio absoluto 24h
            },
          }))
        } catch {}
      }
    }

    connect()
    return () => { dead = true; wsRef.current?.close() }
  }, [])

  return { prices, btcLive }
}
