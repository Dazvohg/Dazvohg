import { tickerInstruments } from '@/data/market'
import { useLivePrices } from '@/hooks/useLivePrices'

export default function MarketTicker() {
  const { prices, btcLive } = useLivePrices()

  const base = tickerInstruments()
  const merged = base.map(i => ({
    ...i,
    price:     prices[i.symbol]?.price     ?? i.price,
    changePct: prices[i.symbol]?.changePct ?? i.changePct,
  }))
  const doubled = [...merged, ...merged]

  return (
    <div className="bg-black border-b border-[#2F3336] h-8 overflow-hidden flex items-center select-none">
      <div className="flex items-center gap-1.5 bg-[#1D9BF0] text-white text-[10px] font-black px-3 h-full shrink-0 z-10 tracking-widest">
        <span className={`w-1.5 h-1.5 rounded-full bg-white ${btcLive ? 'animate-pulse' : 'opacity-40'}`} />
        LIVE
      </div>
      <div className="overflow-hidden flex-1 relative">
        <div className="ticker-track whitespace-nowrap">
          {doubled.map((item, i) => (
            <span key={i} className="inline-flex items-center gap-2 px-5 text-xs border-r border-[#2F3336]">
              <span className="text-[#71767B] font-mono font-medium">{item.symbol}</span>
              <span className="text-[#E7E9EA] font-mono font-semibold">
                {item.symbol === 'MERVAL'
                  ? item.price.toLocaleString('es-AR')
                  : item.symbol === 'BTC'
                  ? `$${Math.round(item.price).toLocaleString('en-US')}`
                  : `$${item.price.toFixed(2)}`}
              </span>
              <span className={`font-mono text-[11px] font-semibold ${item.changePct >= 0 ? 'text-[#00BA7C]' : 'text-[#F4212E]'}`}>
                {item.changePct >= 0 ? '+' : ''}{item.changePct.toFixed(2)}%
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
