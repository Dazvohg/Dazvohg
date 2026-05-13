import { tickerInstruments } from '@/data/market'

const items = [...tickerInstruments(), ...tickerInstruments()]  // doubled for seamless loop

export default function MarketTicker() {
  return (
    <div className="bg-[#0c1221] border-b border-[#1e293b] h-8 overflow-hidden flex items-center select-none">
      <div className="bg-[#10b981] text-black text-xs font-bold px-3 h-full flex items-center shrink-0 z-10">
        LIVE
      </div>
      <div className="overflow-hidden flex-1 relative">
        <div className="ticker-track whitespace-nowrap">
          {items.map((item, i) => (
            <span key={i} className="inline-flex items-center gap-2 px-5 text-xs border-r border-[#1e293b]">
              <span className="text-[#64748b] font-mono">{item.symbol}</span>
              <span className="text-[#f8fafc] font-mono font-medium">
                {item.symbol === 'MERVAL'
                  ? item.price.toLocaleString('es-AR')
                  : item.symbol === 'BTC'
                  ? `$${item.price.toLocaleString()}`
                  : `$${item.price.toFixed(2)}`}
              </span>
              <span className={`font-mono ${item.changePct >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                {item.changePct >= 0 ? '+' : ''}{item.changePct.toFixed(2)}%
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
