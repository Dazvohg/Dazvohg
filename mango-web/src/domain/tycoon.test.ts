import { initialSimulatorState } from './simulator';
import { describe, expect, it } from "vitest";
import { defaultRates } from "./finance";
import { availableObjectives, buyAsset, collectRent, completeObjective, tycoonAssets, tycoonNetWorth } from "./tycoon";
import type { AppState } from "./types";

function makeState(): AppState {
  return {
    user: {
      name: "Test",
      salary: 1000000,
      payday: 28,
      riskLevel: "moderado",
      hidden: false,
      createdAt: new Date().toISOString(),
    },
    accounts: [{ id: "a", institution: "Banco", kind: "CA", balance: 200000 }],
    wallets: [],
    cards: [{ id: "c", issuer: "Visa", brand: "Visa", total: 20000, minimum: 5000, tea: 90, dueDay: 20 }],
    expenses: [
      {
        id: "e",
        amount: 1000,
        myShare: 1000,
        category: "super",
        date: new Date().toISOString(),
        description: "Test",
        shared: false,
      },
    ],
    budgets: [{ id: "b", category: "super", monthlyLimit: 50000 }],
    goals: [],
    tycoon: { mangoCash: 10000, ownedAssets: [], completedObjectiveIds: [], completedLessonIds: [], gameMonth: 1, gameYear: 2024, level: 1, xp: 0, currentEventId: null, eventHistory: [], achievements: [], triggeredEventIds: [] },
    simulator: initialSimulatorState,
    rates: defaultRates,
    live: {},
  };
}

describe("tycoon domain", () => {
  it("marks real-world objectives as ready", () => {
    const objectives = availableObjectives(makeState());
    expect(objectives.find((item) => item.id === "daily-log-expense")?.completedAt).toBeTruthy();
  });

  it("rewards claimed objectives only once", () => {
    const first = completeObjective(makeState(), "manual-learn-module");
    const second = completeObjective(first, "manual-learn-module");
    expect(first.tycoon.mangoCash).toBe(10950);
    expect(second.tycoon.mangoCash).toBe(10950);
  });

  it("buys assets and adds them to tycoon net worth", () => {
    const asset = tycoonAssets[0];
    const next = buyAsset(makeState(), asset.id);
    expect(next.tycoon.ownedAssets).toHaveLength(1);
    expect(tycoonNetWorth(next)).toBe(10000);
  });

  it("collects rent once per day", () => {
    const asset = tycoonAssets[0];
    const bought = buyAsset(makeState(), asset.id);
    const collected = collectRent(bought, bought.tycoon.ownedAssets[0].id);
    const recollected = collectRent(collected, bought.tycoon.ownedAssets[0].id);
    expect(collected.tycoon.mangoCash).toBe(10000 - asset.price + asset.rent);
    expect(recollected.tycoon.mangoCash).toBe(collected.tycoon.mangoCash);
  });
});
