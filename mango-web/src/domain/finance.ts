import type { AppState, Budget, Card, ExpenseCategory, Goal, NetWorthSnapshot, Rates, RiskLevel } from "./types";

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

export function goalProjection(
  goal: { target: number; current: number; deadline?: string },
  monthlySavings: number,
): {
  monthsToGoal: number | null; // null si monthlySavings <= 0
  requiredMonthly: number | null; // para llegar al deadline; null si no hay deadline
  onTrack: boolean;
  dailyRequired: number | null;
} {
  const remaining = Math.max(0, goal.target - goal.current);
  if (remaining === 0) return { monthsToGoal: 0, requiredMonthly: null, onTrack: true, dailyRequired: null };

  const monthsToGoal = monthlySavings > 0 ? Math.ceil(remaining / monthlySavings) : null;

  if (!goal.deadline) {
    return { monthsToGoal, requiredMonthly: null, onTrack: true, dailyRequired: null };
  }

  const daysLeft = daysUntilDeadline(goal.deadline);
  const monthsLeft = daysLeft / 30;
  const requiredMonthly = monthsLeft > 0 ? Math.ceil(remaining / monthsLeft) : null;
  const dailyRequired = daysLeft > 0 ? Math.ceil(remaining / daysLeft) : null;
  const onTrack = monthlySavings > 0 && requiredMonthly != null && monthlySavings >= requiredMonthly;

  return { monthsToGoal, requiredMonthly, onTrack, dailyRequired };
}

export function netWorthGrowth(history: NetWorthSnapshot[]): {
  trend: "up" | "down" | "flat";
  pct: number;
  firstValue: number;
  lastValue: number;
} {
  if (history.length < 2) return { trend: "flat", pct: 0, firstValue: 0, lastValue: 0 };
  const first = history[0].value;
  const last = history[history.length - 1].value;
  if (first === 0) return { trend: last > 0 ? "up" : "flat", pct: 0, firstValue: first, lastValue: last };
  const pct = ((last - first) / Math.abs(first)) * 100;
  const trend = pct > 1 ? "up" : pct < -1 ? "down" : "flat";
  return { trend, pct, firstValue: first, lastValue: last };
}

export type AdviceItem = {
  title: string;
  body: string;
  tab: "expenses" | "goals" | "learn" | "profile" | "simulador" | "mercados" | "tycoon";
  urgency: "high" | "medium" | "low";
};

export function advice(state: AppState): AdviceItem[] {
  const liquid = totalLiquid(state);
  const debt = totalDebt(state);
  const budgets = budgetHealth(state);
  const { inflationAnnual, inflationMonthly } = state.live;
  const { mep, blue } = state.rates;
  const items: AdviceItem[] = [];

  // ── HIGH urgency ──────────────────────────────────────────────────────────

  // Tarjeta venciendo en < 5 días
  const urgentCard = state.cards
    .map((c) => ({ card: c, days: cardUrgency(c) }))
    .find(({ days }) => days < 5);
  if (urgentCard) {
    const { card, days } = urgentCard;
    const interest = cardMonthlyInterest(card);
    items.push({
      title: `${card.issuer} vence en ${days} ${days === 1 ? "día" : "días"}`,
      body: `Mínimo ${money(card.minimum)}. Si refinancias, el interés mensual es ${money(interest)}. Pagá hoy lo que puedas.`,
      tab: "profile",
      urgency: "high",
    });
  }

  // Deuda alta vs liquidez
  if (debt > 100000 && debt > liquid * 0.35) {
    items.push({
      title: "Primero deuda, después inversión",
      body: `Tenés ${money(debt)} en tarjetas. A tasas de refinanciación, pagar deuda suele ganarle a cualquier inversión razonable.`,
      tab: "profile",
      urgency: "high",
    });
  }

  // Presupuesto en rojo
  if (budgets.status === "red") {
    items.push({
      title: "El presupuesto pide atención",
      body: `Ya usaste ${budgets.pct.toFixed(0)}% del presupuesto mensual (${money(budgets.totalSpent)} de ${money(budgets.totalLimit)}). Ajustar ahora vale más que lamentarlo a fin de mes.`,
      tab: "expenses",
      urgency: "high",
    });
  }

  // Meta con deadline urgente
  const urgentGoal = state.goals.find((g) => {
    if (!g.deadline) return false;
    const days = daysUntilDeadline(g.deadline);
    const pct = g.target > 0 ? g.current / g.target : 1;
    return days < 7 && pct < 0.5;
  });
  if (urgentGoal) {
    const days = daysUntilDeadline(urgentGoal.deadline!);
    const missing = urgentGoal.target - urgentGoal.current;
    items.push({
      title: `Meta "${urgentGoal.name}" vence en ${days} días`,
      body: `Falta ${money(missing)} para completarla. Si depositás hoy, llegás. Después puede ser tarde.`,
      tab: "goals",
      urgency: "high",
    });
  }

  // ── MEDIUM urgency ────────────────────────────────────────────────────────

  // Billetera pierde vs inflación anual
  if (inflationAnnual != null) {
    const loserWallet = state.wallets.find(
      (w) => w.balance > 50000 && w.annualRate < inflationAnnual - 10,
    );
    if (loserWallet) {
      const lossPerMonth = Math.round((loserWallet.balance * (inflationAnnual - loserWallet.annualRate)) / 100 / 12);
      items.push({
        title: `${loserWallet.name} pierde vs inflación`,
        body: `Con ${inflationAnnual}% anual, ${money(loserWallet.balance)} en ${loserWallet.name} al ${loserWallet.annualRate}% TNA pierde ${money(lossPerMonth)}/mes de poder adquisitivo real.`,
        tab: "mercados",
        urgency: "medium",
      });
    }
  }

  // Presupuesto amarillo
  if (budgets.status === "yellow") {
    items.push({
      title: "Presupuesto en zona amarilla",
      body: `Usaste ${budgets.pct.toFixed(0)}% del presupuesto. Bajar un cambio ahora es más fácil que recuperar a fin de mes.`,
      tab: "expenses",
      urgency: "medium",
    });
  }

  // Meta con deadline en 30 días
  const nearGoal = state.goals.find((g) => {
    if (!g.deadline || urgentGoal?.name === g.name) return false;
    const days = daysUntilDeadline(g.deadline);
    const pct = g.target > 0 ? g.current / g.target : 1;
    return days < 30 && pct < 0.7;
  });
  if (nearGoal) {
    const days = daysUntilDeadline(nearGoal.deadline!);
    const missing = nearGoal.target - nearGoal.current;
    const perDay = Math.round(missing / days);
    items.push({
      title: `"${nearGoal.name}" vence en ${days} días`,
      body: `Falta ${money(missing)}. Depositando ${money(perDay)}/día llegas justo. Empezá ahora para no correr.`,
      tab: "goals",
      urgency: "medium",
    });
  }

  // Oportunidad MEP vs blue
  if (mep > 0 && blue > 0) {
    const spread = ((blue - mep) / mep) * 100;
    if (spread < 2 && spread > 0) {
      items.push({
        title: "MEP casi igual al blue: dolarizá barato",
        body: `El spread MEP/blue es solo ${spread.toFixed(1)}%. Comprar dólar MEP es legal, seguro y hoy casi igual de barato que el blue.`,
        tab: "mercados",
        urgency: "medium",
      });
    }
  }

  // No completó lección de deuda y tiene tarjeta
  if (
    debt > 0 &&
    !state.tycoon.completedLessonIds.includes("deuda-cara")
  ) {
    items.push({
      title: "Hay una lección que podría ahorrarte plata",
      body: `Tenés ${money(debt)} en tarjetas. La lección "Por qué pagar deuda puede ser invertir" explica exactamente cuánto cuesta refinanciar y qué hacer primero.`,
      tab: "learn",
      urgency: "medium",
    });
  }

  // Inflación alta con plata parada
  if (inflationMonthly != null && inflationMonthly > 4) {
    const allLiquid = state.accounts.reduce((s, a) => s + a.balance, 0);
    if (allLiquid > 100000) {
      items.push({
        title: `Inflación en ${inflationMonthly.toFixed(1)}% mensual: el efectivo parado pierde`,
        body: `${money(allLiquid)} en cuenta corriente o caja de ahorro no rinden nada. FCI Mercado de Dinero devenga diario y rinde más que la inflación proyectada.`,
        tab: "mercados",
        urgency: "medium",
      });
    }
  }

  // ── LOW urgency ───────────────────────────────────────────────────────────

  // Mercado Pago con tasa baja
  const mp = state.wallets.find((w) => w.name.toLowerCase().includes("mercado"));
  if (mp && mp.balance > 100000 && mp.annualRate < 50) {
    const diff = Math.round((mp.balance * (65 - mp.annualRate)) / 100 / 12);
    items.push({
      title: "Tu plata en Mercado Pago puede rendir más",
      body: `Mover ${money(mp.balance)} a una alternativa al 65% TNA suma cerca de ${money(diff)}/mes extra sin riesgo adicional.`,
      tab: "mercados",
      urgency: "low",
    });
  }

  // Sin presupuestos
  if (budgets.status === "empty" && state.expenses.length > 3) {
    items.push({
      title: "Con datos: poné límites que te convengan",
      body: "Ya cargaste gastos. Crear presupuestos por categoría tarda 2 minutos y Mango Tycoon te premia por cumplirlos.",
      tab: "expenses",
      urgency: "low",
    });
  }

  // Liquid > $50k sin inversiones
  if (liquid > 50000 && state.simulator.positions.length === 0) {
    items.push({
      title: "Podemos empezar una cartera educativa",
      body: `Con ${money(liquid)} líquidos, el simulador de Mango te muestra cómo distribuir sin riesgo real, según tu perfil ${state.user?.riskLevel ?? "moderado"}.`,
      tab: "simulador",
      urgency: "low",
    });
  }

  // Sin metas
  if (state.goals.length === 0) {
    items.push({
      title: "¿Para qué estás ahorrando?",
      body: "Definir una meta concreta (viaje, auto, colchón de emergencia) multiplica la probabilidad de cumplirla. Tarda 30 segundos.",
      tab: "goals",
      urgency: "low",
    });
  }

  // Fallback
  if (items.length === 0) {
    items.push({
      title: "Cargá tu foto financiera",
      body: "Agregá sueldo, bancos, billeteras y tarjetas. Con eso Mango empieza a darte decisiones concretas.",
      tab: "profile",
      urgency: "low",
    });
  }

  // Ordenar: high → medium → low
  const order = { high: 0, medium: 1, low: 2 };
  return items.sort((a, b) => order[a.urgency] - order[b.urgency]);
}
