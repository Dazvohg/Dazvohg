import { uid } from "./finance";
import type { AppState, SimAssetCategory, SimPosition, SimTrade, SimulatorState } from "./types";

export const SIM_STARTING_USD = 10_000;

export type SimAsset = {
  id: string;
  symbol: string;
  name: string;
  category: SimAssetCategory;
  description: string;
  lesson: string;
  coingeckoId?: string;
  yahooSymbol?: string;
  defaultPrice: number;
};

export const SIM_ASSETS: SimAsset[] = [
  {
    id: "BTC",
    symbol: "BTC",
    name: "Bitcoin",
    category: "crypto",
    description: "La criptomoneda más grande del mundo.",
    lesson: "Reserva de valor digital. Alta volatilidad, pero 15 años de historia. Nunca pongas más de lo que podés perder.",
    coingeckoId: "bitcoin",
    defaultPrice: 65000,
  },
  {
    id: "ADA",
    symbol: "ADA",
    name: "Cardano",
    category: "crypto",
    description: "Blockchain de tercera generación.",
    lesson: "Tecnología sólida pero más especulativa que BTC. Ideal para entender cómo funcionan las altcoins.",
    coingeckoId: "cardano",
    defaultPrice: 0.45,
  },
  {
    id: "DOGE",
    symbol: "DOGE",
    name: "Dogecoin",
    category: "memecoin",
    description: "Nació como meme, tiene millones de usuarios.",
    lesson: "Las memecoins pueden subir 10x y caer 90% en semanas. Úsalas para entender el riesgo especulativo, nunca como ahorro.",
    coingeckoId: "dogecoin",
    defaultPrice: 0.15,
  },
  {
    id: "SHIB",
    symbol: "SHIB",
    name: "Shiba Inu",
    category: "memecoin",
    description: "Memecoin con precio fraccionario.",
    lesson: "El precio bajo no significa que sea barato. 1 SHIB a $0.00001 tiene el mismo riesgo porcentual que BTC. Lo que importa es la capitalización.",
    coingeckoId: "shiba-inu",
    defaultPrice: 0.000015,
  },
  {
    id: "AAPL",
    symbol: "AAPL",
    name: "Apple Inc.",
    category: "stock",
    description: "Una de las mayores empresas del S&P 500.",
    lesson: "Acciones de empresas sólidas crecen más lento pero caen menos. Apple lleva décadas en el S&P 500. Ideal para carteras de largo plazo.",
    yahooSymbol: "AAPL",
    defaultPrice: 175,
  },
  {
    id: "TSLA",
    symbol: "TSLA",
    name: "Tesla Inc.",
    category: "stock",
    description: "Vehículos eléctricos y energía limpia.",
    lesson: "Tesla es S&P 500 pero con volatilidad de tecnológica. Mucho upside, muchas caídas bruscas. Compará su comportamiento con AAPL.",
    yahooSymbol: "TSLA",
    defaultPrice: 250,
  },
  {
    id: "GGAL",
    symbol: "GGAL",
    name: "Grupo Galicia",
    category: "cedear",
    description: "CEDEAR del banco más grande de Argentina.",
    lesson: "Un CEDEAR te da exposición a acciones argentinas que cotizan en Nueva York. Su precio sigue al dólar: si el peso se devalúa, el CEDEAR sube en pesos.",
    yahooSymbol: "GGAL",
    defaultPrice: 42,
  },
  {
    id: "YPF",
    symbol: "YPF",
    name: "YPF S.A.",
    category: "cedear",
    description: "CEDEAR de la principal petrolera argentina.",
    lesson: "YPF combina riesgo político argentino con precio del petróleo. Si Vaca Muerta avanza, puede ser muy rentable. Si hay intervención estatal, cae fuerte.",
    yahooSymbol: "YPF",
    defaultPrice: 18,
  },
];

export const CATEGORY_LABEL: Record<SimAssetCategory, string> = {
  crypto: "Cripto",
  memecoin: "Memecoin",
  stock: "Acción S&P",
  cedear: "CEDEAR",
};

export const CATEGORY_COLOR: Record<SimAssetCategory, string> = {
  crypto:  "#f59e0b",
  memecoin: "#ec4899",
  stock:   "#10b981",
  cedear:  "#6366f1",
};

export const initialSimulatorState: SimulatorState = {
  cashUsd: SIM_STARTING_USD,
  positions: [],
  trades: [],
  prices: Object.fromEntries(SIM_ASSETS.map((a) => [a.id, a.defaultPrice])),
};

export function simPortfolioValue(state: SimulatorState): number {
  return state.positions.reduce((sum, pos) => {
    return sum + pos.quantity * (state.prices[pos.assetId] ?? 0);
  }, 0);
}

export function simTotalValue(state: SimulatorState): number {
  return state.cashUsd + simPortfolioValue(state);
}

export function simPnl(state: SimulatorState): number {
  return simTotalValue(state) - SIM_STARTING_USD;
}

export function simPnlPct(state: SimulatorState): number {
  return (simPnl(state) / SIM_STARTING_USD) * 100;
}

export function positionValue(pos: SimPosition, prices: Record<string, number>): number {
  return pos.quantity * (prices[pos.assetId] ?? 0);
}

export function positionPnlPct(pos: SimPosition, prices: Record<string, number>): number {
  const current = prices[pos.assetId] ?? 0;
  if (pos.avgBuyPrice === 0) return 0;
  return ((current - pos.avgBuyPrice) / pos.avgBuyPrice) * 100;
}

export function buySimAsset(state: AppState, assetId: string, usdAmount: number): AppState {
  const price = state.simulator.prices[assetId];
  if (!price || usdAmount <= 0 || usdAmount > state.simulator.cashUsd) return state;

  const quantity = usdAmount / price;
  const existing = state.simulator.positions.find((p) => p.assetId === assetId);

  const trade: SimTrade = {
    id: uid(),
    assetId,
    side: "buy",
    quantity,
    price,
    total: usdAmount,
    date: new Date().toISOString(),
  };

  let positions: SimPosition[];
  if (existing) {
    const totalQty = existing.quantity + quantity;
    const totalCost = existing.quantity * existing.avgBuyPrice + usdAmount;
    positions = state.simulator.positions.map((p) =>
      p.assetId === assetId
        ? { ...p, quantity: totalQty, avgBuyPrice: totalCost / totalQty }
        : p,
    );
  } else {
    positions = [...state.simulator.positions, { assetId, quantity, avgBuyPrice: price }];
  }

  return {
    ...state,
    simulator: {
      ...state.simulator,
      cashUsd: state.simulator.cashUsd - usdAmount,
      positions,
      trades: [trade, ...state.simulator.trades].slice(0, 100),
    },
  };
}

export function sellSimAsset(state: AppState, assetId: string, pct: number): AppState {
  const pos = state.simulator.positions.find((p) => p.assetId === assetId);
  if (!pos || pct <= 0) return state;

  const price = state.simulator.prices[assetId];
  if (!price) return state;

  const fraction = Math.min(1, pct / 100);
  const quantity = pos.quantity * fraction;
  const total = quantity * price;

  const trade: SimTrade = {
    id: uid(),
    assetId,
    side: "sell",
    quantity,
    price,
    total,
    date: new Date().toISOString(),
  };

  const newQty = pos.quantity - quantity;
  const positions =
    newQty < 1e-9
      ? state.simulator.positions.filter((p) => p.assetId !== assetId)
      : state.simulator.positions.map((p) =>
          p.assetId === assetId ? { ...p, quantity: newQty } : p,
        );

  return {
    ...state,
    simulator: {
      ...state.simulator,
      cashUsd: state.simulator.cashUsd + total,
      positions,
      trades: [trade, ...state.simulator.trades].slice(0, 100),
    },
  };
}

export function resetSimulator(state: AppState): AppState {
  return {
    ...state,
    simulator: {
      ...initialSimulatorState,
      prices: state.simulator.prices, // mantener precios actuales
    },
  };
}

export function updateSimPrices(
  state: AppState,
  prices: Record<string, number>,
): AppState {
  return {
    ...state,
    simulator: {
      ...state.simulator,
      prices: { ...state.simulator.prices, ...prices },
      pricesUpdatedAt: Date.now(),
    },
  };
}

export function formatSimPrice(price: number): string {
  if (price >= 1000) return `$${price.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  if (price >= 1) return `$${price.toFixed(4)}`;
  if (price >= 0.0001) return `$${price.toFixed(6)}`;
  return `$${price.toExponential(2)}`;
}

export function formatSimQty(qty: number, assetId: string): string {
  if (assetId === "SHIB") return qty.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (qty >= 1) return qty.toLocaleString("en-US", { maximumFractionDigits: 4 });
  return qty.toFixed(6);
}
