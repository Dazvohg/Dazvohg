import type { AppState, Budget, Card, ExpenseCategory, Goal, Rates, RiskLevel } from "./types";

export const defaultRates: Rates = {
  oficial: 1020,
  mep: 1185,
  ccl: 1210,
  blue: 1175,
  cripto: 1195,
  source: "demo",
};

export const categories: Record<ExpenseCategory, { label: string; color: string }> = {
  super: { label: "Super", color: "#2E5EA8" },
  delivery: { label: "Delivery", color: "#C9742A" },
  transporte: { label: "Transporte", color: "#4472C4" },
  servicios: { label: "Servicios", color: "#5A6B85" },
  salud: { label: "Salud", color: "#3F7A4E" },
  ocio: { label: "Ocio", color: "#8a6f2e" },
  ropa: { label: "Ropa", color: "#B73B3B" },
  educacion: { label: "Educacion", color: "#0A1628" },
  otros: { label: "Otros", color: "#6B7280" },
};

export const riskPortfolios: Record<RiskLevel, Array<{ name: string; detail: string; pct: number }>> = {
  conservador: [
    { name: "FCI Money Market", detail: "liquidez diaria", pct: 35 },
    { name: "Plazo fijo UVA", detail: "proteccion CER", pct: 30 },
    { name: "LECAP corta", detail: "pesos corto plazo", pct: 20 },
    { name: "Dolar MEP", detail: "reserva valor", pct: 15 },
  ],
  moderado: [
    { name: "CEDEAR SPY", detail: "acciones USA diversificadas", pct: 30 },
    { name: "Bonos hard dollar", detail: "AL30/GD30", pct: 20 },
    { name: "LECAP / FCI renta fija", detail: "tasa pesos", pct: 25 },
    { name: "Dolar MEP", detail: "colchon", pct: 15 },
    { name: "BTC / ETH DCA", detail: "riesgo controlado", pct: 10 },
  ],
  agresivo: [
    { name: "CEDEAR tech", detail: "NVDA, MSFT, AAPL", pct: 35 },
    { name: "SPY", detail: "base diversificada", pct: 20 },
    { name: "BTC / ETH", detail: "cripto blue chip", pct: 20 },
    { name: "Acciones argentinas", detail: "YPF, GGAL", pct: 15 },
    { name: "Cash MEP", detail: "oportunidades", pct: 10 },
  ],
};

export function uid() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function money(value: number, hidden = false) {
  if (hidden) return "$...";
  return `$${Math.round(value || 0).toLocaleString("es-AR")}`;
}

export function totalLiquid(state: AppState) {
  return (
    state.accounts.reduce((sum, item) => sum + item.balance, 0) +
    state.wallets.reduce((sum, item) => sum + item.balance, 0)
  );
}

export function totalDebt(state: AppState) {
  return state.cards.reduce((sum, item) => sum + item.total, 0);
}

export function netWorth(state: AppState) {
  return totalLiquid(state) - totalDebt(state);
}

export function monthlyExpenses(state: AppState, month = new Date()) {
  const target = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
  return state.expenses
    .filter((expense) => expense.date.startsWith(target))
    .reduce((sum, expense) => sum + expense.myShare, 0);
}

export function monthlyExpensesByCategory(state: AppState, month = new Date()) {
  const target = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
  const totals = new Map<ExpenseCategory, number>();
  for (const expense of state.expenses) {
    if (!expense.date.startsWith(target)) continue;
    totals.set(expense.category, (totals.get(expense.category) ?? 0) + expense.myShare);
  }
  return totals;
}

export function budgetUsage(state: AppState, budget: Budget, month = new Date()) {
  const spent = monthlyExpensesByCategory(state, month).get(budget.category) ?? 0;
  const pct = budget.monthlyLimit > 0 ? (spent / budget.monthlyLimit) * 100 : 0;
  const status = pct >= 100 ? "red" : pct >= 80 ? "yellow" : "green";
  return { spent, remaining: budget.monthlyLimit - spent, pct, status };
}

export function budgetHealth(state: AppState, month = new Date()) {
  if (state.budgets.length === 0) {
    return { totalLimit: 0, totalSpent: 0, pct: 0, status: "empty" as const, overBudget: false };
  }
  const totals = monthlyExpensesByCategory(state, month);
  const totalLimit = state.budgets.reduce((sum, budget) => sum + budget.monthlyLimit, 0);
  const totalSpent = state.budgets.reduce(
    (sum, budget) => sum + (totals.get(budget.category) ?? 0),
    0,
  );
  const pct = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0;
  const status = pct >= 100 ? "red" : pct >= 80 ? "yellow" : "green";
  return { totalLimit, totalSpent, pct, status, overBudget: pct > 100 };
}

export function cardUrgency(card: Card) {
  const today = new Date().getDate();
  let diff = card.dueDay - today;
  if (diff < 0) diff += 30;
  return diff;
}

export function cardMonthlyInterest(card: Card) {
  const monthlyRate = Math.pow(1 + card.tea / 100, 1 / 12) - 1;
  return card.total * monthlyRate;
}

export function goalProgress(goal: Goal) {
  const pct = goal.target > 0 ? Math.min(100, (goal.current / goal.target) * 100) : 0;
  const remaining = Math.max(0, goal.target - goal.current);
  const done = goal.current >= goal.target;
  return { pct, remaining, done };
}

export function addToGoal(state: AppState, goalId: string, amount: number): AppState {
  return {
    ...state,
    goals: state.goals.map((goal) =>
      goal.id === goalId ? { ...goal, current: Math.min(goal.target, goal.current + amount) } : goal,
    ),
  };
}

export function daysUntilDeadline(deadline: string) {
  const diff = new Date(deadline).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function advice(state: AppState) {
  const liquid = totalLiquid(state);
  const debt = totalDebt(state);
  const budgets = budgetHealth(state);
  const mp = state.wallets.find((wallet) => wallet.name.toLowerCase().includes("mercado"));
  if (debt > 100000 && debt > liquid * 0.35) {
    return {
      title: "Primero deuda, despues inversion",
      body: `Tenes ${money(debt)} en tarjetas. A tasas de refinanciacion, pagar deuda suele ganarle a cualquier inversion razonable.`,
      action: "Tarjetas",
    };
  }
  if (budgets.status === "red") {
    return {
      title: "El presupuesto pide atencion",
      body: `Ya usaste ${budgets.pct.toFixed(0)}% del presupuesto mensual. Ajustar ahora vale mas que lamentarlo a fin de mes.`,
      action: "Gastos",
    };
  }
  if (mp && mp.balance > 100000 && mp.annualRate < 24) {
    const diff = (mp.balance * (27 - mp.annualRate)) / 100 / 12;
    return {
      title: "Tu plata parada puede rendir mas",
      body: `Mover ${money(mp.balance)} desde ${mp.name} a una alternativa al 27% TNA suma cerca de ${money(diff)} por mes.`,
      action: "Cuentas",
    };
  }
  if (liquid > 50000) {
    return {
      title: "Podemos empezar una cartera",
      body: `Con ${money(liquid)} liquidos, Mango puede separar colchon, deuda y una cartera segun tu perfil.`,
      action: "Invertir",
    };
  }
  return {
    title: "Carguemos tu foto financiera",
    body: "Agrega sueldo, bancos, billeteras y tarjetas. Con eso Mango empieza a darte decisiones concretas.",
    action: "Cuentas",
  };
}
