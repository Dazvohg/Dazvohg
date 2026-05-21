import { defaultRates } from "../domain/finance";
import { initialSimulatorState } from "../domain/simulator";
import type { AppState } from "../domain/types";

// v3: agrega game loop (level, xp, events, achievements)
const KEY = "mango:state:v3";

export const initialState: AppState = {
  user: null,
  accounts: [],
  wallets: [],
  cards: [],
  expenses: [],
  budgets: [],
  goals: [],
  tycoon: {
    mangoCash: 2500,
    ownedAssets: [],
    completedObjectiveIds: [],
    completedLessonIds: [],
    gameMonth: 1,
    gameYear: 2024,
    level: 1,
    xp: 0,
    currentEventId: null,
    eventHistory: [],
    achievements: [],
    triggeredEventIds: [],
  },
  simulator: initialSimulatorState,
  rates: defaultRates,
  live: {},
  netWorthHistory: [],
};

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw);
    return {
      ...initialState,
      ...parsed,
      tycoon: { ...initialState.tycoon, ...parsed.tycoon },
      simulator: { ...initialSimulatorState, ...parsed.simulator },
    };
  } catch {
    return initialState;
  }
}

export function saveState(state: AppState) {
  const ph = state.simulator.priceHistory ?? {};
  const trimmed: AppState = {
    ...state,
    simulator: {
      ...state.simulator,
      trades: state.simulator.trades.slice(0, 50),
      priceHistory: Object.fromEntries(
        Object.entries(ph).map(([k, v]) => [k, v.slice(-48)]),
      ),
    },
    tycoon: {
      ...state.tycoon,
      eventHistory: state.tycoon.eventHistory.slice(-30),
    },
    netWorthHistory: (state.netWorthHistory ?? []).slice(-36), // max 3 años de datos
  };
  localStorage.setItem(KEY, JSON.stringify(trimmed));
}

export function resetState() {
  localStorage.removeItem(KEY);
}
