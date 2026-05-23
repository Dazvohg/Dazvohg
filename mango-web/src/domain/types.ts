import type { GameEventRecord } from "./events";

export type RiskLevel = "conservador" | "moderado" | "agresivo";

export type OnboardingGoal = "finanzas" | "invertir" | "tycoon" | "todo";

export type UserProfile = {
  name: string;
  salary: number;
  payday: number;
  riskLevel: RiskLevel;
  goal?: OnboardingGoal;
  hidden: boolean;
  createdAt: string;
  acceptedTermsAt?: string;  // ISO date — registra cuándo aceptó los términos
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

export type RateSnapshot = {
  date: string;   // "YYYY-MM-DD"
  mep: number;
  blue: number;
  oficial: number;
};

export type Rates = {
  oficial: number;
  mep: number;
  ccl: number;
  blue: number;
  cripto: number;
  updatedAt?: number;
  source: "demo" | "live";
  history?: RateSnapshot[];
};

export type LiveData = {
  inflationMonthly?: number;
  inflationAnnual?: number;
  countryRisk?: number;
  countryRiskSource?: "live" | "referencial";
  badlarTNA?: number;        // tasa BADLAR bancos privados (variable 7 BCRA)
  pasesTNA?: number;         // tasa pases pasivos / política monetaria (variable 6 BCRA)
  ratesSource?: "live" | "referencial";  // fuente de badlarTNA y pasesTNA
  lecapTEM?: number;         // TEM implícito calculado desde precio de mercado BYMA
  lecapSource?: "live" | "referencial";
  updatedAt?: number;
  source?: "live" | "referencial";
};

export type SimAssetCategory = "crypto" | "memecoin" | "stock" | "cedear" | "bono";

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
  priceHistory: Record<string, Array<{ t: number; p: number }>>; // últimos 48 puntos por asset
};

export type NetWorthSnapshot = {
  date: string;  // ISO date "YYYY-MM-DD"
  value: number; // net worth in ARS at that point
};

// ── Grupos compartidos ─────────────────────────────────────────────────────────

export type SharedGroup = {
  id: string;
  name: string;
  created_by: string;
  invite_token: string;
  created_at: string;
};

export type GroupMember = {
  group_id: string;
  user_id: string;
  display_name: string;
  joined_at: string;
};

export type GroupExpense = {
  id: string;
  group_id: string;
  added_by: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  date: string;
  created_at: string;
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
  netWorthHistory: NetWorthSnapshot[];
};
