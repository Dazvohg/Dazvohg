import type { AppState } from "../domain/types";

export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function notificationPermission(): "granted" | "denied" | "default" | "unsupported" {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

type ScheduledAlert = {
  at: string;   // ISO date-time string
  title: string;
  body: string;
  tag: string;
};

export async function scheduleAlerts(state: AppState): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  if (Notification.permission !== "granted") return;

  const reg = await navigator.serviceWorker.ready;
  const alerts: ScheduledAlert[] = [];
  const now = new Date();

  // ── Tarjetas próximas a vencer ─────────────────────────────────────────────
  for (const card of state.cards) {
    if (card.total <= 0) continue;
    const dueDate = new Date();
    dueDate.setDate(card.dueDay);
    if (dueDate < now) dueDate.setMonth(dueDate.getMonth() + 1);
    const daysLeft = Math.ceil((dueDate.getTime() - now.getTime()) / 86400000);
    if (daysLeft <= 3 && daysLeft >= 0) {
      // Notify at 9am the day of or day before
      const notifDate = new Date(dueDate);
      notifDate.setDate(notifDate.getDate() - 1);
      notifDate.setHours(9, 0, 0, 0);
      alerts.push({
        at:    notifDate.toISOString(),
        title: `💳 Vence ${card.issuer} ${card.brand}`,
        body:  `Mínimo $${card.minimum.toLocaleString("es-AR")} · Total $${card.total.toLocaleString("es-AR")}`,
        tag:   `card-${card.id}`,
      });
    }
  }

  // ── Metas con deadline próximo ─────────────────────────────────────────────
  for (const goal of state.goals) {
    if (!goal.deadline) continue;
    const deadline = new Date(goal.deadline);
    const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / 86400000);
    if (daysLeft <= 7 && daysLeft >= 0) {
      const progress = goal.target > 0 ? goal.current / goal.target : 1;
      if (progress < 0.9) {
        const notifDate = new Date();
        notifDate.setDate(notifDate.getDate() + 1);
        notifDate.setHours(10, 0, 0, 0);
        const falta = goal.target - goal.current;
        alerts.push({
          at:    notifDate.toISOString(),
          title: `🎯 Meta "${goal.name}" vence pronto`,
          body:  `Faltan $${falta.toLocaleString("es-AR")} · ${daysLeft} día${daysLeft !== 1 ? "s" : ""} restante${daysLeft !== 1 ? "s" : ""}`,
          tag:   `goal-${goal.id}`,
        });
      }
    }
  }

  // ── Recordatorio semanal de registro de gastos (domingo 9am) ──────────────
  const nextSunday = new Date(now);
  nextSunday.setDate(now.getDate() + (7 - now.getDay()) % 7 || 7);
  nextSunday.setHours(9, 0, 0, 0);
  const monthExpenses = state.expenses.filter((e) => {
    const d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  if (monthExpenses.length < 3) {
    alerts.push({
      at:    nextSunday.toISOString(),
      title: "📊 ¿Registraste tus gastos?",
      body:  "Llevá el control de tu semana en CheMonei.",
      tag:   "weekly-reminder",
    });
  }

  if (alerts.length > 0) {
    reg.active?.postMessage({ type: "SCHEDULE_NOTIFICATIONS", alerts });
  }
}
