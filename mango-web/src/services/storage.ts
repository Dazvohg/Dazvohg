import { defaultRates } from "../domain/finance";
import { initialSimulatorState } from "../domain/simulator";
import type { AppState } from "../domain/types";

// v2: agrega SimulatorState
const KEY = "mango:state:v2";

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
  },
  simulator: initialSimulatorState,
  rates: defaultRates,
  live: {},
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
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function resetState() {
  localStorage.removeItem(KEY);
}
