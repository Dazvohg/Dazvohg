import { tickerInstruments } from '@/data/market'

const items = [...tickerInstruments(), ...tickerInstruments()]

export default function MarketTicker() {
  return (
    <div className="bg-black border-b border-[#2F3336] h-8 overflow-hidden flex items-center select-none">
      <div className="bg-[#1D9BF0] text-white text-[10px] font-black px-3 h-full flex items-center shrink-0 z-10 tracking-widest">
        LIVE
      </div>
      <div className="overflow-hidden flex-1 relative">
        <div className="ticker-track whitespace-nowrap">
          {items.map((item, i) => (
            <span key={i} className="inline-flex items-center gap-2 px-5 text-xs border-r border-[#2F3336]">
              <span className="text-[#71767B] font-mono font-medium">{item.symbol}</span>
              <span className="text-[#E7E9EA] font-mono font-semibold">
                {item.symbol === 'MERVAL'
                  ? item.price.toLocaleString('es-AR')
                  : item.symbol === 'BTC'
                  ? `$${item.price.toLocaleString()}`
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
