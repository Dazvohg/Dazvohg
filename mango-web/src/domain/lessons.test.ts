import { initialSimulatorState } from './simulator';
import { describe, expect, it } from "vitest";
import { defaultRates } from "./finance";
import { completeLesson, lessonReward, lessons } from "./lessons";
import type { AppState } from "./types";

const state: AppState = {
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
};

describe("lessons", () => {
  it("has clear educational content and quiz options", () => {
    expect(lessons.length).toBeGreaterThanOrEqual(5);
    for (const lesson of lessons) {
      expect(lesson.sections.length).toBeGreaterThanOrEqual(3);
      expect(lesson.quiz.options).toHaveLength(3);
    }
  });

  it("rewards completed lessons once", () => {
    const first = completeLesson(state, lessons[0].id);
    const second = completeLesson(first, lessons[0].id);
    expect(first.tycoon.mangoCash).toBe(2500 + lessonReward);
    expect(second.tycoon.mangoCash).toBe(first.tycoon.mangoCash);
  });
});
