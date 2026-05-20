import type { GameEventRecord } from "./events";

export type RiskLevel = "conservador" | "moderado" | "agresivo";

export type UserProfile = {
  name: string;
  salary: number;
  payday: number;
  riskLevel: RiskLevel;
  hidden: boolean;
  createdAt: string;
};

export type Account = {
  id: string;
  institution: string;
  kind: "CA" | "CC";
  balance: number;
};

export type Wallet = {
  id: string;
  name: string;
  balance: number;
  annualRate: number;
};

export type Card = {
  id: string;
  issuer: string;
  brand: "Visa" | "Mastercard" | "Amex" | "Otra";
  total: number;
  minimum: number;
  tea: number;
  dueDay: number;
};

export type ExpenseCategory =
  | "super"
  | "delivery"
  | "transporte"
  | "servicios"
  | "salud"
  | "ocio"
  | "ropa"
  | "educacion"
  | "otros";

export type Expense = {
  id: string;
  date: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  shared: boolean;
  myShare: number;
};

export type Budget = {
  id: string;
  category: ExpenseCategory;
  monthlyLimit: number;
};

export type Goal = {
  id: string;
  name: string;
  target: number;
  current: number;
  deadline?: string;
};

export type TycoonAssetKind = "real_estate" | "business" | "startup";

export type TycoonAsset = {
  id: string;
  name: string;
  province: string;
  city: string;
  kind: TycoonAssetKind;
  price: number;
  rent: number;
  risk: "bajo" | "medio" | "alto";
  lesson: string;
};

export type OwnedTycoonAsset = {
  id: string;
  assetId: string;
  boughtAt: string;
  rentCollectedAt?: string;
};

export type ObjectiveCadence =
  | "diario"
  | "semanal"
  | "quincenal"
  | "mensual"
  | "bimestral"
  | "trimestral"
  | "cuatrimestral"
  | "semestral"
  | "anual";

export type TycoonObjective = {
  id: string;
  title: string;
  cadence: ObjectiveCadence;
  reward: number;
  completedAt?: string;
  source: "auto" | "manual";
  lesson: string;
};

export type TycoonState = {
  mangoCash: number;
  ownedAssets: OwnedTycoonAsset[];
  completedObjectiveIds: string[];
  completedLessonIds: string[];
  // game loop v3
  gameMonth: number;
  gameYear: number;
  level: number;
  xp: number;
  currentEventId: string | null;
  eventHistory: GameEventRecord[];
  achievements: string[];
  triggeredEventIds: string[]; // cola: eventos encolados por lecciones o cadenas
};

export type Rates = {
  oficial: number;
  mep: number;
  ccl: number;
  blue: number;
  cripto: number;
  updatedAt?: number;
  source: "demo" | "live";
};

export type LiveData = {
  inflationMonthly?: number;
  inflationAnnual?: number;
  countryRisk?: number;
};

export type SimAssetCategory = "crypto" | "memecoin" | "stock" | "cedear";

export type SimPosition = {
  assetId: string;
  quantity: number;
  avgBuyPrice: number; // USD
};

export type SimTrade = {
  id: string;
  assetId: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  total: number; // USD
  date: string;
};

export type SimulatorState = {
  cashUsd: number;
  positions: SimPosition[];
  trades: SimTrade[];
  prices: Record<string, number>; // assetId → USD price
  pricesUpdatedAt?: number;
};

export type AppState = {
  user: UserProfile | null;
  accounts: Account[];
  wallets: Wallet[];
  cards: Card[];
  expenses: Expense[];
  budgets: Budget[];
  goals: Goal[];
  tycoon: TycoonState;
  simulator: SimulatorState;
  rates: Rates;
  live: LiveData;
};
