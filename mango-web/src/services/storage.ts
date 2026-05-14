import { defaultRates } from "../domain/finance";
import type { AppState } from "../domain/types";

const KEY = "mango:state:v1";

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
  rates: defaultRates,
  live: {},
};

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw);
    return { ...initialState, ...parsed, tycoon: { ...initialState.tycoon, ...parsed.tycoon } };
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
