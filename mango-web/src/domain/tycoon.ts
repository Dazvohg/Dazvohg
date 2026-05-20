import { budgetHealth, monthlyExpenses, totalDebt, totalLiquid, uid } from "./finance";
import type { AppState, OwnedTycoonAsset, TycoonAsset, TycoonObjective } from "./types";
import { GAME_EVENTS, checkNewAchievements, getNextEvent, levelFromXP } from "./events";
import type { GameEventRecord } from "./events";

export const tycoonAssets: TycoonAsset[] = [
  {
    id: "monoambiente-caballito",
    name: "Monoambiente en Caballito",
    province: "CABA",
    city: "Caballito",
    kind: "real_estate",
    price: 6500,
    rent: 520,
    risk: "bajo",
    lesson: "Ubicacion estable: renta menor, vacancia baja. Es el equivalente ludico a priorizar seguridad.",
  },
  {
    id: "local-cordoba",
    name: "Local gastronomico en Guemes",
    province: "Cordoba",
    city: "Cordoba Capital",
    kind: "business",
    price: 8200,
    rent: 780,
    risk: "medio",
    lesson: "Un negocio puede rendir mas que un alquiler, pero exige margen, rotacion y control de costos.",
  },
  {
    id: "cabana-bariloche",
    name: "Cabana turistica",
    province: "Rio Negro",
    city: "Bariloche",
    kind: "real_estate",
    price: 12000,
    rent: 1150,
    risk: "medio",
    lesson: "Turismo: buenos picos de caja, pero estacionalidad. No confundas mes bueno con ingreso estable.",
  },
  {
    id: "pozo-neuquen",
    name: "Servicio petrolero chico",
    province: "Neuquen",
    city: "Anelo",
    kind: "business",
    price: 18000,
    rent: 2100,
    risk: "alto",
    lesson: "Alto retorno viene con concentracion y riesgo operativo. Diversificar evita depender de un solo motor.",
  },
  {
    id: "finca-mendoza",
    name: "Finca boutique",
    province: "Mendoza",
    city: "Lujan de Cuyo",
    kind: "real_estate",
    price: 14500,
    rent: 1350,
    risk: "medio",
    lesson: "Activos productivos: tierra, marca y turismo. Aprendes que el rendimiento no es solo alquiler.",
  },
  {
    id: "startup-fintech",
    name: "Fintech desde cero",
    province: "Buenos Aires",
    city: "La Plata",
    kind: "startup",
    price: 24000,
    rent: 3600,
    risk: "alto",
    lesson: "Startups: upside enorme, probabilidad de falla tambien. Nunca se financian con plata de emergencia.",
  },
];

export const baseObjectives: TycoonObjective[] = [
  {
    id: "daily-log-expense",
    title: "Registrar un gasto hoy",
    cadence: "diario",
    reward: 150,
    source: "auto",
    lesson: "Lo que se mide se puede mejorar. Registrar es el primer paso del control.",
  },
  {
    id: "weekly-three-expenses",
    title: "Registrar 3 gastos",
    cadence: "semanal",
    reward: 700,
    source: "auto",
    lesson: "Una semana con datos vale mas que una intuicion.",
  },
  {
    id: "monthly-positive-net",
    title: "Mantener patrimonio positivo",
    cadence: "mensual",
    reward: 1800,
    source: "auto",
    lesson: "Patrimonio positivo significa que tus activos liquidos superan la deuda cara.",
  },
  {
    id: "monthly-debt-under-liquid",
    title: "Deuda menor al 50% de liquidez",
    cadence: "mensual",
    reward: 2200,
    source: "auto",
    lesson: "La deuda manejable deja espacio para invertir y respirar.",
  },
  {
    id: "manual-learn-module",
    title: "Completar una leccion financiera",
    cadence: "quincenal",
    reward: 950,
    source: "manual",
    lesson: "Aprender tambien capitaliza: mejores decisiones, menos errores caros.",
  },
  {
    id: "manual-no-minimum",
    title: "Pagar mas que el minimo",
    cadence: "mensual",
    reward: 2600,
    source: "manual",
    lesson: "Pagar minimo compra tiempo caro. Pagar extra corta interes compuesto en contra.",
  },
  {
    id: "weekly-budget-created",
    title: "Crear al menos un presupuesto",
    cadence: "semanal",
    reward: 800,
    source: "auto",
    lesson: "Poner un limite antes de gastar transforma deseo en plan.",
  },
  {
    id: "monthly-inside-budget",
    title: "Seguir dentro del presupuesto mensual",
    cadence: "mensual",
    reward: 2400,
    source: "auto",
    lesson: "Cerrar el mes dentro del presupuesto entrena disciplina sin prohibirte vivir.",
  },
];

export function availableObjectives(state: AppState): TycoonObjective[] {
  const today = new Date().toISOString().slice(0, 10);
  const autoComplete = new Set<string>();
  const todayExpenses = state.expenses.filter((expense) => expense.date.startsWith(today));
  const budgets = budgetHealth(state);

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const thisWeekExpenses = state.expenses.filter((expense) => expense.date.slice(0, 10) >= weekStartStr);

  if (todayExpenses.length >= 1) autoComplete.add("daily-log-expense");
  if (thisWeekExpenses.length >= 3) autoComplete.add("weekly-three-expenses");
  if (totalLiquid(state) - totalDebt(state) > 0) autoComplete.add("monthly-positive-net");
  if (totalDebt(state) <= totalLiquid(state) * 0.5) autoComplete.add("monthly-debt-under-liquid");
  if (state.budgets.length > 0) autoComplete.add("weekly-budget-created");
  if (state.budgets.length > 0 && !budgets.overBudget) autoComplete.add("monthly-inside-budget");

  return baseObjectives.map((objective) => ({
    ...objective,
    completedAt:
      state.tycoon.completedObjectiveIds.includes(objective.id) || autoComplete.has(objective.id)
        ? new Date().toISOString()
        : undefined,
  }));
}

export function completeObjective(state: AppState, objectiveId: string): AppState {
  const objective = baseObjectives.find((item) => item.id === objectiveId);
  if (!objective || state.tycoon.completedObjectiveIds.includes(objectiveId)) return state;
  return {
    ...state,
    tycoon: {
      ...state.tycoon,
      mangoCash: state.tycoon.mangoCash + objective.reward,
      completedObjectiveIds: [...state.tycoon.completedObjectiveIds, objectiveId],
    },
  };
}

export function buyAsset(state: AppState, assetId: string): AppState {
  const asset = tycoonAssets.find((item) => item.id === assetId);
  if (!asset || state.tycoon.mangoCash < asset.price) return state;
  const owned: OwnedTycoonAsset = {
    id: uid(),
    assetId,
    boughtAt: new Date().toISOString(),
  };
  return {
    ...state,
    tycoon: {
      ...state.tycoon,
      mangoCash: state.tycoon.mangoCash - asset.price,
      ownedAssets: [...state.tycoon.ownedAssets, owned],
    },
  };
}

export function collectRent(state: AppState, ownedId: string): AppState {
  const owned = state.tycoon.ownedAssets.find((item) => item.id === ownedId);
  if (!owned) return state;
  const asset = tycoonAssets.find((item) => item.id === owned.assetId);
  if (!asset) return state;
  const today = new Date().toISOString().slice(0, 10);
  if (owned.rentCollectedAt?.startsWith(today)) return state;

  return {
    ...state,
    tycoon: {
      ...state.tycoon,
      mangoCash: state.tycoon.mangoCash + asset.rent,
      ownedAssets: state.tycoon.ownedAssets.map((item) =>
        item.id === ownedId ? { ...item, rentCollectedAt: new Date().toISOString() } : item,
      ),
    },
  };
}

export function tycoonNetWorth(state: AppState) {
  const assets = state.tycoon.ownedAssets.reduce((sum, owned) => {
    const asset = tycoonAssets.find((item) => item.id === owned.assetId);
    return sum + (asset?.price ?? 0);
  }, 0);
  return state.tycoon.mangoCash + assets;
}

// ── Game Loop v3 ──────────────────────────────────────────────────────────────

export type EventResolution = {
  eventId: string;
  choiceId: string;
  choiceLabel: string;
  consequence: string;
  delta: number;
  quality: "great" | "ok" | "bad";
  xpEarned: number;
  newLevel: number;
  prevLevel: number;
  newAchievements: string[];
  eduNote: string;
};

export function startNextMonth(state: AppState): AppState {
  const nextEvent = getNextEvent(state.tycoon.level, state.tycoon.eventHistory);
  return {
    ...state,
    tycoon: {
      ...state.tycoon,
      currentEventId: nextEvent.id,
    },
  };
}

export function resolveGameEvent(
  state: AppState,
  choiceId: string,
): { newState: AppState; resolution: EventResolution } {
  const event = GAME_EVENTS.find((e) => e.id === state.tycoon.currentEventId);
  if (!event) return { newState: state, resolution: {} as EventResolution };

  const choice = event.choices.find((c) => c.id === choiceId);
  if (!choice) return { newState: state, resolution: {} as EventResolution };

  const yearScale = 1 + (state.tycoon.gameYear - 2024) * 0.15;
  const delta = Math.round(choice.baseDelta * yearScale);
  const xpEarned = choice.xp;

  const newXp = state.tycoon.xp + xpEarned;
  const newLevel = levelFromXP(newXp);
  const prevLevel = state.tycoon.level;

  let nextMonth = state.tycoon.gameMonth + 1;
  let nextYear = state.tycoon.gameYear;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }

  const record: GameEventRecord = {
    month: state.tycoon.gameMonth,
    year: state.tycoon.gameYear,
    eventId: event.id,
    choiceId,
    delta,
    xpEarned,
  };

  const totalMonths = state.tycoon.eventHistory.length + 1;
  const newAchievements = checkNewAchievements(
    state.tycoon.achievements,
    event.id,
    choiceId,
    newLevel,
    totalMonths,
  );
  const justEarned = newAchievements.filter((a) => !state.tycoon.achievements.includes(a));

  const resolution: EventResolution = {
    eventId: event.id,
    choiceId,
    choiceLabel: choice.label,
    consequence: choice.consequence,
    delta,
    quality: choice.quality,
    xpEarned,
    newLevel,
    prevLevel,
    newAchievements: justEarned,
    eduNote: event.eduNote,
  };

  const newState: AppState = {
    ...state,
    tycoon: {
      ...state.tycoon,
      mangoCash: Math.max(0, state.tycoon.mangoCash + delta),
      xp: newXp,
      level: newLevel,
      gameMonth: nextMonth,
      gameYear: nextYear,
      currentEventId: null,
      eventHistory: [...state.tycoon.eventHistory, record],
      achievements: newAchievements,
    },
  };

  return { newState, resolution };
}

export function realWorldBridge(state: AppState) {
  const expenses = monthlyExpenses(state);
  if (expenses === 0) return "Carga gastos reales para desbloquear misiones automaticas.";
  if (totalDebt(state) > totalLiquid(state)) return "Tu mundo real pide bajar deuda: Mango Tycoon te premia por cortar intereses.";
  return "Tu mundo real esta generando datos. Eso alimenta tu progreso ficticio.";
}
