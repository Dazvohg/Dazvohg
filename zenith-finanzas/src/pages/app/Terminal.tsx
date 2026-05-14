import { useState } from 'react'
import { TrendingUp, TrendingDown, Zap, Activity } from 'lucide-react'
import Header from '@/components/Header'
import PriceChart from '@/components/PriceChart'
import RegimeBadge from '@/components/RegimeBadge'
import SignalCard from '@/components/SignalCard'
import { INSTRUMENTS, REGIMES } from '@/data/market'
import { SIGNALS } from '@/data/signals'

const TIMEFRAMES = ['5s', '15s', '1m', '5m', '15m', '1h']

export default function Terminal() {
  const [selectedSymbol, setSelectedSymbol] = useState('YPF')
  const [selectedTf, setSelectedTf] = useState('1m')

  const instrument = INSTRUMENTS.find(i => i.symbol === selectedSymbol) ?? INSTRUMENTS[1]
  const signalForSymbol = SIGNALS.filter(s => s.symbol === selectedSymbol)
  const currentRegime = { ...REGIMES[0], confidence: 0.847 }

  return (
    <div className="p-6 space-y-4">
      <Header title="Terminal de Trading" subtitle="Análisis de precio en tiempo real + señales Mango" />

      <div className="flex gap-4 items-start">

        {/* Left: instrument picker */}
        <div className="w-44 shrink-0 space-y-1">
          <div className="text-[#71767B] text-xs uppercase tracking-wide px-2 mb-2">Instrumentos</div>
          {INSTRUMENTS.map(inst => (
            <button
              key={inst.symbol}
              onClick={() => setSelectedSymbol(inst.symbol)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                selectedSymbol === inst.symbol
                  ? 'bg-[#1D9BF0]/10 border border-[#1D9BF0]/20 text-[#1D9BF0]'
                  : 'text-[#71767B] hover:bg-[#2F3336] hover:text-[#E7E9EA]'
              }`}
            >
              <span className="font-mono font-bold">{inst.symbol}</span>
              <span className={inst.changePct >= 0 ? 'text-[#00BA7C]' : 'text-[#F4212E]'}>
                {inst.changePct >= 0 ? '+' : ''}{inst.changePct.toFixed(2)}%
              </span>
            </button>
          ))}
        </div>

        {/* Center: chart */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Price header */}
          <div className="bg-[#16181C] border border-[#2F3336] rounded-xl px-5 py-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-[#E7E9EA] font-black text-2xl font-mono">{instrument.symbol}</span>
                <span className="text-[#71767B] text-sm">{instrument.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  instrument.type === 'adr' ? 'bg-[#1D9BF0]/10 text-[#1D9BF0]' :
                  instrument.type === 'bond' ? 'bg-[#f59e0b]/10 text-[#f59e0b]' :
                  instrument.type === 'crypto' ? 'bg-[#8b5cf6]/10 text-[#8b5cf6]' :
                  'bg-[#1D9BF0]/10 text-[#1D9BF0]'
                }`}>{instrument.type}</span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-3xl font-black font-mono text-[#E7E9EA]">
                  {instrument.symbol === 'MERVAL'
                    ? instrument.price.toLocaleString('es-AR')
                    : instrument.symbol === 'BTC'
                    ? `$${instrument.price.toLocaleString()}`
                    : `$${instrument.price.toFixed(2)}`}
                </span>
                <span className={`flex items-center gap-1 text-sm font-mono ${
                  instrument.changePct >= 0 ? 'text-[#00BA7C]' : 'text-[#F4212E]'
                }`}>
                  {instrument.changePct >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {instrument.changePct >= 0 ? '+' : ''}{instrument.changePct.toFixed(2)}%
                  ({instrument.changePct >= 0 ? '+' : ''}{instrument.change.toFixed(2)})
                </span>
              </div>
            </div>
            {/* Timeframe selector */}
            <div className="flex items-center gap-1">
              {TIMEFRAMES.map(tf => (
                <button
                  key={tf}
                  onClick={() => setSelectedTf(tf)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors font-mono ${
                    selectedTf === tf
                      ? 'bg-[#1D9BF0]/15 text-[#1D9BF0] font-semibold'
                      : 'text-[#71767B] hover:text-[#E7E9EA] hover:bg-[#2F3336]'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* Chart */}
          <div className="bg-[#16181C] border border-[#2F3336] rounded-xl p-4">
            <PriceChart symbol={instrument.symbol} basePrice={instrument.price} height={300} showAxes />
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Apertura',  value: `$${(instrument.price * 0.985).toFixed(2)}` },
              { label: 'Máximo',    value: `$${(instrument.price * 1.012).toFixed(2)}` },
              { label: 'Mínimo',    value: `$${(instrument.price * 0.978).toFixed(2)}` },
              { label: 'Volumen',   value: instrument.volume >= 1e9
                ? `${(instrument.volume / 1e9).toFixed(1)}B`
                : `${(instrument.volume / 1e6).toFixed(1)}M` },
            ].map(s => (
              <div key={s.label} className="bg-[#16181C] border border-[#2F3336] rounded-xl p-3 text-center">
                <div className="text-[#71767B] text-xs mb-1">{s.label}</div>
                <div className="font-mono text-[#E7E9EA] font-semibold text-sm">{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: signals + regime */}
        <div className="w-72 shrink-0 space-y-4">
          <RegimeBadge regime={currentRegime} confidence={currentRegime.confidence} />

          {/* Zenith signal for this instrument */}
          <div className="bg-[#16181C] border border-[#2F3336] rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[#2F3336]">
              <Zap size={14} className="text-[#1D9BF0]" />
              <span className="text-[#E7E9EA] text-sm font-medium">Señales Mango · {instrument.symbol}</span>
            </div>
            {signalForSymbol.length === 0 ? (
              <div className="p-5 text-center text-[#71767B] text-sm">
                <Activity size={24} className="mx-auto mb-2 opacity-30" />
                Sin señales activas para este instrumento
              </div>
            ) : (
              <div className="p-3 space-y-3">
                {signalForSymbol.map(s => (
                  <SignalCard key={s.id} signal={s} compact={false} />
                ))}
              </div>
            )}
          </div>

          {/* Indicators */}
          <div className="bg-[#16181C] border border-[#2F3336] rounded-xl p-4">
            <div className="text-[#E7E9EA] text-sm font-medium mb-3">Indicadores Técnicos</div>
            <div className="space-y-2 text-xs">
              {[
                { name: 'RSI (14)',    value: '58.4',  signal: 'neutral',  color: '#f59e0b' },
                { name: 'MACD',       value: '+0.018', signal: 'alcista', color: '#1D9BF0' },
                { name: 'BB Width',   value: '0.043', signal: 'bajo',    color: '#1D9BF0' },
                { name: 'ATR (14)',   value: '0.32',  signal: 'normal',  color: '#71767B' },
                { name: 'VWAP dev.',  value: '+0.8%', signal: 'arriba',  color: '#1D9BF0' },
                { name: 'OBV trend',  value: '↑ bullish', signal: 'alcista', color: '#1D9BF0' },
              ].map(ind => (
                <div key={ind.name} className="flex items-center justify-between">
                  <span className="text-[#71767B]">{ind.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[#E7E9EA]">{ind.value}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: ind.color, background: `${ind.color}18` }}>
                      {ind.signal}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
