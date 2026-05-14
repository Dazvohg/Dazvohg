import { initialSimulatorState } from './simulator';
import { describe, expect, it } from "vitest";
import {
  advice,
  budgetHealth,
  budgetUsage,
  defaultRates,
  money,
  monthlyExpenses,
  netWorth,
  totalDebt,
  totalLiquid,
} from "./finance";
import type { AppState } from "./types";

const state: AppState = {
  user: {
    name: "Test",
    salary: 1000000,
    payday: 28,
    riskLevel: "moderado",
    hidden: false,
    createdAt: new Date().toISOString(),
  },
  accounts: [{ id: "a", institution: "Banco", kind: "CA", balance: 100000 }],
  wallets: [{ id: "w", name: "Mercado Pago", balance: 50000, annualRate: 21 }],
  cards: [{ id: "c", issuer: "Visa", brand: "Visa", total: 40000, minimum: 8000, tea: 90, dueDay: 20 }],
  expenses: [{ id: "e", amount: 12000, myShare: 12000, category: "super", date: new Date().toISOString(), description: "Coto", shared: false }],
  budgets: [{ id: "b", category: "super", monthlyLimit: 20000 }],
  goals: [],
  tycoon: { mangoCash: 2500, ownedAssets: [], completedObjectiveIds: [], completedLessonIds: [] },
  simulator: initialSimulatorState,
    rates: defaultRates,
  live: {},
};

describe("finance domain", () => {
  it("formats Argentine pesos", () => {
    expect(money(123456)).toBe("$123.456");
  });

  it("calculates liquid, debt and net worth", () => {
    expect(totalLiquid(state)).toBe(150000);
    expect(totalDebt(state)).toBe(40000);
    expect(netWorth(state)).toBe(110000);
  });

  it("calculates current month expenses", () => {
    expect(monthlyExpenses(state)).toBe(12000);
  });

  it("returns actionable advice", () => {
    expect(advice(state).title.length).toBeGreaterThan(5);
  });

  it("calculates budget usage", () => {
    expect(budgetUsage(state, state.budgets[0]).spent).toBe(12000);
    expect(budgetHealth(state).status).toBe("green");
  });
});
