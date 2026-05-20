import {
  BarChart3,
  BookOpen,
  CreditCard,
  Eye,
  EyeOff,
  Home,
  LineChart,
  Lock,
  Plus,
  RefreshCw,
  ShieldCheck,
  Target,
  Trash2,
  TrendingUp,
  UserRound,
  WalletCards,
  Building2,
  Coins,
  Trophy,
  ArrowDownCircle,
  ArrowUpCircle,
  Zap,
} from "lucide-react";
import type React from "react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addToGoal,
  advice,
  budgetHealth,
  budgetUsage,
  cardMonthlyInterest,
  cardUrgency,
  categories,
  daysUntilDeadline,
  goalProgress,
  money,
  monthlyExpenses,
  netWorth,
  riskPortfolios,
  totalDebt,
  totalLiquid,
  uid,
} from "../domain/finance";
import type { AppState, ExpenseCategory, RiskLevel } from "../domain/types";
import { completeLesson, lessonReward, lessons } from "../domain/lessons";
import {
  availableObjectives,
  buyAsset,
  collectRent,
  completeObjective,
  realWorldBridge,
  startNextMonth,
  resolveGameEvent,
  tycoonAssets,
  tycoonNetWorth,
} from "../domain/tycoon";
import type { EventResolution } from "../domain/tycoon";
import {
  GAME_EVENTS,
  LEVEL_NAMES,
  XP_THRESHOLDS,
  xpForNextLevel,
  ACHIEVEMENTS,
} from "../domain/events";
import type { GameEvent as TycoonGameEvent } from "../domain/events";
import {
  SIM_ASSETS,
  SIM_STARTING_USD,
  CATEGORY_LABEL,
  CATEGORY_COLOR,
  buySimAsset,
  sellSimAsset,
  resetSimulator,
  simPortfolioValue,
  simTotalValue,
  simPnl,
  simPnlPct,
  positionValue,
  positionPnlPct,
  formatSimPrice,
  formatSimQty,
  updateSimPrices,
} from "../domain/simulator";
import { fetchRates } from "../services/liveData";
import { fetchSimPrices } from "../services/prices";
import { resetState } from "../services/storage";
import { usePersistentState } from "./usePersistentState";

type Tab = "home" | "simulador" | "learn" | "tycoon" | "expenses" | "goals" | "mercados" | "profile";

const categoryOptions = Object.entries(categories) as Array<
  [ExpenseCategory, { label: string; color: string }]
>;

export function App() {
  const [state, setState] = usePersistentState();
  const [tab, setTab] = useState<Tab>("home");

  useEffect(() => {
    if (!state.user) return;
    fetchRates(state.rates).then((rates) => {
      if (rates !== state.rates) setState((current) => ({ ...current, rates }));
    });
  }, [state.user]);

  if (!state.user) return <Onboarding setState={setState} />;

  return (
    <div className="app-shell">
      <Header state={state} setState={setState} />
      <main className="content">
        {tab === "home"      && <HomeTab state={state} setState={setState} setTab={setTab} />}
        {tab === "simulador" && <SimulatorTab state={state} setState={setState} />}
        {tab === "learn"     && <LearnTab state={state} setState={setState} />}
        {tab === "tycoon"    && <TycoonTab state={state} setState={setState} />}
        {tab === "expenses"  && <ExpensesTab state={state} setState={setState} />}
        {tab === "goals"     && <GoalsTab state={state} setState={setState} />}
        {tab === "mercados"  && <MercadosTab setTab={setTab} />}
        {tab === "profile"   && <ProfileTab state={state} setState={setState} />}
      </main>
      <TabBar tab={tab} setTab={setTab} />
    </div>
  );
}

function Onboarding({ setState }: { setState: React.Dispatch<React.SetStateAction<AppState>> }) {
  const [name, setName] = useState("");
  const [salary, setSalary] = useState("1500000");
  const [payday, setPayday] = useState("28");
  const [riskLevel, setRiskLevel] = useState<RiskLevel>("moderado");

  function submit(event: FormEvent) {
    event.preventDefault();
    setState((state) => ({
      ...state,
      user: {
        name: name.trim() || "Tu cuenta",
        salary: Number(salary) || 0,
        payday: Number(payday) || 28,
        riskLevel,
        hidden: false,
        createdAt: new Date().toISOString(),
      },
    }));
  }

  return (
    <div className="onboarding">
      <section className="hero">
        <Brand />
        <p className="eyebrow">Mango PWA</p>
        <h1>Tu plata, en orden.</h1>
        <p>
          Web primero, instalable en Android, lista para Play Store. Arrancamos con tus
          numeros basicos y despues vamos sumando modulos.
        </p>
      </section>
      <form className="panel setup" onSubmit={submit}>
        <label>
          Nombre o apodo
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Brian" />
        </label>
        <label>
          Sueldo neto mensual
          <input value={salary} onChange={(event) => setSalary(event.target.value)} inputMode="numeric" />
        </label>
        <label>
          Dia de cobro
          <input value={payday} onChange={(event) => setPayday(event.target.value)} inputMode="numeric" />
        </label>
        <div>
          <span className="field-title">Perfil inicial</span>
          <div className="segmented">
            {(["conservador", "moderado", "agresivo"] as const).map((risk) => (
              <button
                className={riskLevel === risk ? "active" : ""}
                key={risk}
                onClick={() => setRiskLevel(risk)}
                type="button"
              >
                {risk}
              </button>
            ))}
          </div>
        </div>
        <button className="primary" type="submit">
          Empezar
        </button>
      </form>
    </div>
  );
}

function Header({
  state,
  setState,
}: {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}) {
  const hidden = state.user?.hidden ?? false;
  return (
    <header className="topbar">
      <div className="topbar-row">
        <Brand />
        <button
          className="icon-button"
          onClick={() =>
            setState((current) => ({
              ...current,
              user: current.user ? { ...current.user, hidden: !current.user.hidden } : null,
            }))
          }
          title="Ocultar saldos"
        >
          {hidden ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      <p className="eyebrow">Hola, {state.user?.name}</p>
      <h2>{money(netWorth(state), hidden)}</h2>
      <div className="metric-grid">
        <Metric label="Liquido" value={money(totalLiquid(state), hidden)} />
        <Metric label="Deuda" value={money(totalDebt(state), hidden)} tone="warn" />
      </div>
    </header>
  );
}

function HomeTab({
  state,
  setState,
  setTab,
}: {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  setTab: (tab: Tab) => void;
}) {
  const currentAdvice = advice(state);
  const expenses = monthlyExpenses(state);
  const budget = budgetHealth(state);
  const nextCard = [...state.cards].sort((a, b) => cardUrgency(a) - cardUrgency(b))[0];

  async function refresh() {
    const rates = await fetchRates(state.rates);
    setState((current) => ({ ...current, rates }));
  }

  return (
    <>
      <MangoScoreCard state={state} setTab={setTab} />

      <ArenaWeekCard state={state} setTab={setTab} />

      <section className="panel advice">
        <p className="eyebrow">Asesor Mango</p>
        <h3>{currentAdvice.title}</h3>
        <p>{currentAdvice.body}</p>
      </section>

      <button className="tycoon-entry" onClick={() => setTab("tycoon")}>
        <div>
          <p className="eyebrow">Juego interno</p>
          <h3>Mango Tycoon</h3>
          <span>
            Tenes {state.tycoon.mangoCash.toLocaleString("es-AR")} Mangos para comprar activos y cobrar rentas.
          </span>
        </div>
        <Building2 size={34} />
      </button>

      <section className="section">
        <div className="section-title">
          <h3>Dolar al instante</h3>
          <button className="ghost small" onClick={refresh}>
            <RefreshCw size={14} /> Actualizar
          </button>
        </div>
        <div className="rate-grid">
          {(["oficial", "mep", "ccl", "blue", "cripto"] as const).map((key) => (
            <div className="rate-card" key={key}>
              <span>{key}</span>
              <strong>${Math.round(state.rates[key]).toLocaleString("es-AR")}</strong>
            </div>
          ))}
        </div>
        <p className="fine-print">
          Fuente: {state.rates.source === "live" ? "dolarapi.com" : "demo offline"}
        </p>
      </section>

      <section className="panel">
        <div className="split">
          <div>
            <p className="eyebrow">Este mes</p>
            <h3>{money(expenses, state.user?.hidden)}</h3>
          </div>
          <BarChart3 />
        </div>
        <div className="progress">
          <span style={{ width: `${Math.min(100, (expenses / Math.max(state.user?.salary ?? 1, 1)) * 100)}%` }} />
        </div>
      </section>

      <section className={`panel budget-summary ${budget.status}`}>
        <div className="split">
          <div>
            <p className="eyebrow">Presupuesto</p>
            <h3>
              {budget.status === "empty"
                ? "Sin limites todavia"
                : `${budget.pct.toFixed(0)}% usado`}
            </h3>
            <p>
              {budget.status === "empty"
                ? "Arma presupuestos por categoria y Mango Tycoon te premia por cumplirlos."
                : `${money(budget.totalSpent)} de ${money(budget.totalLimit)} este mes.`}
            </p>
          </div>
          <button className="ghost small" onClick={() => setTab("expenses")}>
            Ver
          </button>
        </div>
      </section>

      <div className="quick-grid">
        <button className="quick-card" onClick={() => setTab("expenses")}>
          <Plus /> Cargar gasto
        </button>
        <button className="quick-card" onClick={() => setTab("simulador")}>
          <LineChart /> Simular cartera
        </button>
        <button className="quick-card" onClick={() => setTab("profile")}>
          <WalletCards /> Agregar cuenta
        </button>
        <button className="quick-card" onClick={() => setTab("learn")}>
          <BookOpen /> Aprender
        </button>
      </div>

      {nextCard && (
        <section className="panel danger">
          <p className="eyebrow">Proximo vencimiento</p>
          <h3>
            {nextCard.issuer} {nextCard.brand}
          </h3>
          <p>
            Vence en {cardUrgency(nextCard)} dias. Interes mensual estimado si refinancias:
            {" "}
            <strong>{money(cardMonthlyInterest(nextCard))}</strong>.
          </p>
        </section>
      )}
    </>
  );
}

function InvestTab({
  state,
  setState,
}: {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}) {
  const [amount, setAmount] = useState(300000);
  const risk = state.user?.riskLevel ?? "moderado";
  const portfolio = riskPortfolios[risk];
  const debt = totalDebt(state);

  return (
    <>
      <PageIntro title="Invertir" text="Simulador educativo. Mango informa, vos decidis." />
      {debt > 100000 && (
        <section className="panel danger">
          <p className="eyebrow">Prioridad financiera</p>
          <h3>Pagar deuda rinde mas</h3>
          <p>
            Tenes {money(debt)} en tarjetas. Antes de invertir, bajar esa deuda suele ser
            la decision matematicamente mas fuerte.
          </p>
        </section>
      )}
      <section className="panel">
        <label>
          Monto a simular
          <input
            value={amount}
            onChange={(event) => setAmount(Number(event.target.value) || 0)}
            inputMode="numeric"
          />
        </label>
        <div className="segmented">
          {(["conservador", "moderado", "agresivo"] as const).map((item) => (
            <button
              className={risk === item ? "active" : ""}
              key={item}
              onClick={() =>
                setState((current) => ({
                  ...current,
                  user: current.user ? { ...current.user, riskLevel: item } : null,
                }))
              }
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
      </section>
      <section className="panel">
        <p className="eyebrow">Cartera {risk}</p>
        <div className="portfolio-list">
          {portfolio.map((item) => (
            <div className="portfolio-row" key={item.name}>
              <div>
                <strong>{item.name}</strong>
                <span>{item.detail}</span>
              </div>
              <div>
                <strong>{money((amount * item.pct) / 100)}</strong>
                <span>{item.pct}%</span>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="panel muted">
        <ShieldCheck />
        <p>
          Disclaimer: esto es educacion financiera y simulacion. No es recomendacion de
          compra ni asesoramiento registrado.
        </p>
      </section>
    </>
  );
}

function LearnTab({
  state,
  setState,
}: {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const selected = lessons.find((lesson) => lesson.id === selectedId);

  if (selected) {
    const completed = state.tycoon.completedLessonIds.includes(selected.id);
    const answeredCorrectly = selectedAnswer === selected.quiz.answerIndex;
    return (
      <>
        <button className="ghost small back-button" onClick={() => { setSelectedId(null); setSelectedAnswer(null); }}>
          Volver
        </button>
        <article className="lesson-detail">
          <div className="lesson-hero">
            <p className="eyebrow">Aprender · {selected.level}</p>
            <h2>{selected.title}</h2>
            <p>{selected.subtitle}</p>
            <div className="tag-row">
              {selected.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </div>

          {selected.sections.map((section) => (
            <section className="panel lesson-section" key={section.title}>
              <h3>{section.title}</h3>
              <p>{section.body}</p>
            </section>
          ))}

          <section className="panel example-panel">
            <p className="eyebrow">Ejemplo aplicado</p>
            <p>{selected.example(state)}</p>
          </section>

          <section className="panel quiz-panel">
            <p className="eyebrow">Mini quiz</p>
            <h3>{selected.quiz.question}</h3>
            <div className="quiz-options">
              {selected.quiz.options.map((option, index) => (
                <button
                  className={selectedAnswer === index ? "selected" : ""}
                  key={option}
                  onClick={() => setSelectedAnswer(index)}
                  type="button"
                >
                  {option}
                </button>
              ))}
            </div>
            {selectedAnswer !== null && (
              <div className={`quiz-result ${answeredCorrectly ? "ok" : "bad"}`}>
                <strong>{answeredCorrectly ? "Bien ahi." : "Casi. Leelo asi:"}</strong>
                <p>{selected.quiz.explanation}</p>
              </div>
            )}
            <button
              className="primary"
              disabled={!answeredCorrectly || completed}
              onClick={() => setState((current) => completeLesson(current, selected.id))}
            >
              {completed ? "Recompensa cobrada" : `Cobrar ${lessonReward} Mangos`}
            </button>
          </section>
        </article>
      </>
    );
  }

  return (
    <>
      <PageIntro title="Aprender" text="Lecciones claras, ejemplos reales y mini quizzes con recompensa." />
      <section className="panel learning-summary">
        <p className="eyebrow">Progreso</p>
        <h3>
          {state.tycoon.completedLessonIds.length}/{lessons.length} lecciones completadas
        </h3>
        <p>
          Cada quiz correcto suma {lessonReward} Mangos. Aprender tambien capitaliza.
        </p>
      </section>
      <div className="lesson-grid">
        {lessons.map((lesson) => (
          <button className="lesson-card" key={lesson.id} onClick={() => setSelectedId(lesson.id)}>
            <div>
              <p className="eyebrow">Modulo · {lesson.level}</p>
              <h3>{lesson.title}</h3>
              <p>{lesson.subtitle}</p>
              <div className="tag-row">
                {lesson.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </div>
            <strong>
              {state.tycoon.completedLessonIds.includes(lesson.id) ? "Completada" : `+${lessonReward} M`}
            </strong>
          </button>
        ))}
      </div>
    </>
  );
}

// ── Tycoon Game Loop v3 ───────────────────────────────────────────────────────

function LevelBar({
  level,
  levelName,
  xp,
  xpPct,
  xpNext,
}: {
  level: number;
  levelName: string;
  xp: number;
  xpPct: number;
  xpNext: number;
}) {
  return (
    <div className="level-bar-panel">
      <div className="level-bar-header">
        <div className="level-bar-left">
          <span className="level-badge">Nv {level}</span>
          <strong className="level-name">{levelName}</strong>
        </div>
        <span className="xp-label">{xp.toLocaleString("es-AR")} XP</span>
      </div>
      <div className="level-bar-track">
        <div className="level-bar-fill" style={{ width: `${Math.max(2, Math.min(100, xpPct))}%` }} />
      </div>
      {xpNext < Infinity && (
        <p className="level-bar-hint">
          Faltan {(xpNext - xp).toLocaleString("es-AR")} XP para nivel {level + 1}
        </p>
      )}
    </div>
  );
}

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function MonthHub({
  gameMonth,
  gameYear,
  mangoCash,
  totalMonths,
  onAdvance,
}: {
  gameMonth: number;
  gameYear: number;
  mangoCash: number;
  totalMonths: number;
  onAdvance: () => void;
}) {
  const monthName = MONTH_NAMES[gameMonth - 1] ?? "Enero";
  return (
    <div className="month-hub panel">
      <div className="month-hub-header">
        <div>
          <p className="eyebrow">Mes en juego</p>
          <h3 className="month-hub-title">
            {monthName} {gameYear}
          </h3>
          <span className="month-hub-sub">
            {totalMonths === 0
              ? "Primer mes — ¡comenzá!"
              : `${totalMonths} ${totalMonths === 1 ? "mes completado" : "meses completados"}`}
          </span>
        </div>
        <div className="month-hub-cash">
          <span className="eyebrow">Caja</span>
          <strong>{mangoCash.toLocaleString("es-AR")} M</strong>
        </div>
      </div>
      <button className="primary month-hub-btn" onClick={onAdvance}>
        🎲 ¿Qué pasa este mes?
      </button>
    </div>
  );
}

const CAT_STYLE: Record<string, { color: string; bg: string }> = {
  inflacion:   { color: "#F4212E", bg: "rgba(244,33,46,.09)" },
  dolar:       { color: "#00BA7C", bg: "rgba(0,186,124,.09)" },
  deuda:       { color: "#F59E0B", bg: "rgba(245,158,11,.09)" },
  oportunidad: { color: "#1D9BF0", bg: "rgba(29,155,240,.09)" },
  emergencia:  { color: "#F4212E", bg: "rgba(244,33,46,.09)" },
  bonus:       { color: "#00BA7C", bg: "rgba(0,186,124,.09)" },
};

function EventCard({
  event,
  completedLessonIds,
  gameYear,
  onChoice,
}: {
  event: TycoonGameEvent;
  completedLessonIds: string[];
  gameYear: number;
  onChoice: (id: string) => void;
}) {
  const cat = CAT_STYLE[event.category] ?? { color: "#71767B", bg: "rgba(113,118,123,.09)" };
  return (
    <div className="event-card panel" style={{ borderColor: cat.color + "88" }}>
      <div className="event-card-top">
        <span className="event-category-badge" style={{ color: cat.color, background: cat.bg }}>
          {event.categoryLabel}
        </span>
        <span className="event-card-emoji">{event.emoji}</span>
      </div>
      <h3 className="event-title">{event.title}</h3>
      <p className="event-body">{event.body}</p>
      {gameYear > 2024 && (
        <p className="event-year-tag">Año {gameYear} · cifras escaladas</p>
      )}
      <div className="event-choices">
        {event.choices.map((choice) => {
          const locked =
            !!choice.requiredLessonId && !completedLessonIds.includes(choice.requiredLessonId);
          return (
            <button
              key={choice.id}
              className={`event-choice choice-q--${choice.quality}${locked ? " event-choice--locked" : ""}`}
              disabled={locked}
              onClick={() => onChoice(choice.id)}
            >
              <div className="event-choice-body">
                <strong>{choice.label}</strong>
                <span>{choice.desc}</span>
                {locked && (
                  <span className="event-choice-lock-msg">
                    🔒 Completá la lección "{choice.requiredLessonId}" primero
                  </span>
                )}
              </div>
              <span className="event-choice-indicator">
                {choice.quality === "great" ? "▲▲" : choice.quality === "ok" ? "▲" : "▼"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ConsequenceCard({
  resolution,
  onContinue,
}: {
  resolution: EventResolution;
  onContinue: () => void;
}) {
  const isGreat = resolution.quality === "great";
  const isBad = resolution.quality === "bad";
  const qualityEmoji = isGreat ? "🏆" : isBad ? "⚠️" : "👍";
  const qualityLabel = isGreat ? "¡Gran jugada!" : isBad ? "Podría ser mejor" : "No estuvo mal";
  const deltaPositive = resolution.delta >= 0;
  const deltaStr = `${deltaPositive ? "+" : ""}${resolution.delta.toLocaleString("es-AR")} M`;

  return (
    <div className={`consequence-card panel consequence-card--${resolution.quality}`}>
      <div className="consequence-top">
        <span className="consequence-emoji-big">{qualityEmoji}</span>
        <div className="consequence-meta">
          <strong className={`consequence-quality-label cq--${resolution.quality}`}>
            {qualityLabel}
          </strong>
          <span className="consequence-choice-label">Elegiste: {resolution.choiceLabel}</span>
        </div>
        <span
          className="consequence-delta"
          style={{ color: deltaPositive ? "var(--green)" : "var(--red)" }}
        >
          {deltaStr}
        </span>
      </div>

      <p className="consequence-text">{resolution.consequence}</p>

      <div className="consequence-xp-row">
        <span className="xp-earned-badge">+{resolution.xpEarned} XP</span>
        {resolution.newLevel > resolution.prevLevel && (
          <span className="level-up-badge">⬆️ ¡Nivel {resolution.newLevel}!</span>
        )}
      </div>

      {resolution.newAchievements.length > 0 && (
        <div className="consequence-achievements">
          <p className="eyebrow">🏅 Logros desbloqueados</p>
          {resolution.newAchievements.map((id) => {
            const a = ACHIEVEMENTS.find((ac) => ac.id === id);
            if (!a) return null;
            return (
              <div key={id} className="achievement-new-row">
                <span className="achievement-new-emoji">{a.emoji}</span>
                <div>
                  <strong>{a.title}</strong>
                  <span>{a.desc}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="consequence-edu">
        <p className="eyebrow">💡 ¿Por qué?</p>
        <p>{resolution.eduNote}</p>
      </div>

      <button className="primary" onClick={onContinue}>
        Continuar →
      </button>
    </div>
  );
}

function AchievementsStrip({ achievements }: { achievements: string[] }) {
  return (
    <div className="achievements-strip panel">
      <p className="eyebrow">
        Logros · {achievements.length}/{ACHIEVEMENTS.length}
      </p>
      {achievements.length === 0 ? (
        <p className="achievements-empty-msg">Jugá eventos para desbloquear logros</p>
      ) : (
        <div className="achievements-scroll">
          {ACHIEVEMENTS.map((a) => {
            const earned = achievements.includes(a.id);
            return (
              <div
                key={a.id}
                className={`achievement-chip ${earned ? "achievement-chip--earned" : "achievement-chip--locked"}`}
                title={a.desc}
              >
                <span>{a.emoji}</span>
                <span>{a.title}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TycoonTab({
  state,
  setState,
}: {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}) {
  const [resolution, setResolution] = useState<EventResolution | null>(null);

  const { level, xp, gameMonth, gameYear, currentEventId, eventHistory, achievements } =
    state.tycoon;
  const currentEvent = currentEventId
    ? (GAME_EVENTS.find((e) => e.id === currentEventId) ?? null)
    : null;

  const xpCurrent = XP_THRESHOLDS[level - 1] ?? 0;
  const xpNext = xpForNextLevel(level);
  const xpPct =
    xpNext === Infinity
      ? 100
      : Math.round(((xp - xpCurrent) / (xpNext - xpCurrent)) * 100);
  const levelName = LEVEL_NAMES[level] ?? "Mango Master";

  const owned = state.tycoon.ownedAssets
    .map((item) => ({ owned: item, asset: tycoonAssets.find((a) => a.id === item.assetId) }))
    .filter(
      (item): item is {
        owned: (typeof state.tycoon.ownedAssets)[number];
        asset: (typeof tycoonAssets)[number];
      } => Boolean(item.asset),
    );
  const objectives = availableObjectives(state);
  const completed = objectives.filter((o) => o.completedAt).length;

  function handleChoice(choiceId: string) {
    const { newState, resolution: res } = resolveGameEvent(state, choiceId);
    setState(newState);
    setResolution(res);
  }

  function handleAdvanceMonth() {
    setState((current) => startNextMonth(current));
  }

  return (
    <>
      <PageIntro
        title="Mango Tycoon"
        text="Tomá decisiones de finanzas argentinas reales. Subí de nivel, desbloqueá logros."
      />

      <LevelBar
        level={level}
        levelName={levelName}
        xp={xp}
        xpPct={xpPct}
        xpNext={xpNext}
      />

      {resolution ? (
        <ConsequenceCard resolution={resolution} onContinue={() => setResolution(null)} />
      ) : currentEvent ? (
        <EventCard
          event={currentEvent}
          completedLessonIds={state.tycoon.completedLessonIds}
          gameYear={gameYear}
          onChoice={handleChoice}
        />
      ) : (
        <MonthHub
          gameMonth={gameMonth}
          gameYear={gameYear}
          mangoCash={state.tycoon.mangoCash}
          totalMonths={eventHistory.length}
          onAdvance={handleAdvanceMonth}
        />
      )}

      <AchievementsStrip achievements={achievements} />

      <section className="panel">
        <div className="section-title">
          <div>
            <p className="eyebrow">Misiones</p>
            <h3>Hábitos que pagan</h3>
          </div>
          <Trophy color="#C9742A" />
        </div>
        <div className="mission-list">
          {objectives.map((objective) => {
            const alreadyClaimed = state.tycoon.completedObjectiveIds.includes(objective.id);
            const canClaim = Boolean(objective.completedAt) && !alreadyClaimed;
            return (
              <article
                className={`mission ${objective.completedAt ? "done" : ""}`}
                key={objective.id}
              >
                <div>
                  <strong>{objective.title}</strong>
                  <span>
                    {objective.cadence} · +{objective.reward.toLocaleString("es-AR")} Mangos
                  </span>
                  <p>{objective.lesson}</p>
                </div>
                {canClaim ? (
                  <button
                    className="primary compact"
                    onClick={() =>
                      setState((current) => completeObjective(current, objective.id))
                    }
                  >
                    Cobrar
                  </button>
                ) : (
                  <span className={`status-pill ${alreadyClaimed ? "claimed" : ""}`}>
                    {alreadyClaimed ? "cobrado" : objective.completedAt ? "listo" : "pendiente"}
                  </span>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {owned.length > 0 && (
        <section className="panel">
          <p className="eyebrow">Tu imperio</p>
          <div className="asset-list">
            {owned.map(({ owned: ownedItem, asset }) => {
              const collectedToday = ownedItem.rentCollectedAt?.startsWith(
                new Date().toISOString().slice(0, 10),
              );
              return (
                <article className="asset-card owned" key={ownedItem.id}>
                  <div>
                    <strong>{asset.name}</strong>
                    <span>
                      {asset.city}, {asset.province}
                    </span>
                    <p>Renta: {asset.rent.toLocaleString("es-AR")} Mangos</p>
                  </div>
                  <button
                    className="ghost small"
                    disabled={collectedToday}
                    onClick={() => setState((current) => collectRent(current, ownedItem.id))}
                  >
                    {collectedToday ? "Cobrado" : "Cobrar renta"}
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section className="panel">
        <p className="eyebrow">Mercado argentino</p>
        <h3>Comprar activos</h3>
        <div className="asset-list">
          {tycoonAssets.map((asset) => {
            const canBuy = state.tycoon.mangoCash >= asset.price;
            return (
              <article className="asset-card" key={asset.id}>
                <div className="asset-topline">
                  <div>
                    <strong>{asset.name}</strong>
                    <span>
                      {asset.city}, {asset.province} · riesgo {asset.risk}
                    </span>
                  </div>
                  <Building2 size={22} />
                </div>
                <p>{asset.lesson}</p>
                <div className="asset-economics">
                  <span>Precio: {asset.price.toLocaleString("es-AR")} M</span>
                  <span>Renta: {asset.rent.toLocaleString("es-AR")} M</span>
                </div>
                <button
                  className={canBuy ? "primary" : "ghost"}
                  disabled={!canBuy}
                  onClick={() => setState((current) => buyAsset(current, asset.id))}
                >
                  {canBuy ? "Comprar" : "Faltan Mangos"}
                </button>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}

function ExpensesTab({
  state,
  setState,
}: {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("super");
  const [budgetCategory, setBudgetCategory] = useState<ExpenseCategory>("super");
  const [budgetLimit, setBudgetLimit] = useState("");
  const [visibleCount, setVisibleCount] = useState(12);
  const total = monthlyExpenses(state);
  const byCategory = useMemo(() => {
    const map = new Map<ExpenseCategory, number>();
    for (const expense of state.expenses) {
      map.set(expense.category, (map.get(expense.category) ?? 0) + expense.myShare);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [state.expenses]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const numeric = Number(amount);
    if (!numeric) return;
    setState((current) => ({
      ...current,
      expenses: [
        {
          id: uid(),
          amount: numeric,
          myShare: numeric,
          category,
          description: description.trim() || categories[category].label,
          shared: false,
          date: new Date().toISOString(),
        },
        ...current.expenses,
      ],
    }));
    setAmount("");
    setDescription("");
  }

  function submitBudget(event: FormEvent) {
    event.preventDefault();
    const monthlyLimit = Number(budgetLimit);
    if (!monthlyLimit) return;
    setState((current) => {
      const existing = current.budgets.find((budget) => budget.category === budgetCategory);
      if (existing) {
        return {
          ...current,
          budgets: current.budgets.map((budget) =>
            budget.id === existing.id ? { ...budget, monthlyLimit } : budget,
          ),
        };
      }
      return {
        ...current,
        budgets: [...current.budgets, { id: uid(), category: budgetCategory, monthlyLimit }],
      };
    });
    setBudgetLimit("");
  }

  return (
    <>
      <PageIntro title="Gastos" text="Registra consumos y mira por donde se va la plata." />
      <section className="panel">
        <p className="eyebrow">Gastado este mes</p>
        <h3>{money(total, state.user?.hidden)}</h3>
      </section>

      <section className="panel">
        <p className="eyebrow">Presupuestos</p>
        <h3>Limites por categoria</h3>
        <form className="budget-form" onSubmit={submitBudget}>
          <select value={budgetCategory} onChange={(event) => setBudgetCategory(event.target.value as ExpenseCategory)}>
            {categoryOptions.map(([key, item]) => (
              <option key={key} value={key}>
                {item.label}
              </option>
            ))}
          </select>
          <input
            value={budgetLimit}
            onChange={(event) => setBudgetLimit(event.target.value)}
            inputMode="numeric"
            placeholder="Limite mensual"
          />
          <button className="primary" type="submit">
            Guardar
          </button>
        </form>
        {state.budgets.length === 0 ? (
          <p className="empty-note">Crea tu primer limite. Ejemplo: Delivery $80.000.</p>
        ) : (
          <div className="budget-list">
            {state.budgets.map((budget) => {
              const usage = budgetUsage(state, budget);
              return (
                <article className={`budget-row ${usage.status}`} key={budget.id}>
                  <div className="budget-row-head">
                    <div>
                      <strong>{categories[budget.category].label}</strong>
                      <span>
                        {money(usage.spent)} de {money(budget.monthlyLimit)}
                      </span>
                    </div>
                    <button
                      className="icon-button light"
                      onClick={() =>
                        setState((current) => ({
                          ...current,
                          budgets: current.budgets.filter((item) => item.id !== budget.id),
                        }))
                      }
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="progress budget-progress">
                    <span style={{ width: `${Math.min(100, usage.pct)}%` }} />
                  </div>
                  <p>
                    {usage.status === "green" && `Te quedan ${money(Math.max(0, usage.remaining))}. Bien ahi.`}
                    {usage.status === "yellow" && "Zona amarilla: todavia llegas, pero conviene bajar un cambio."}
                    {usage.status === "red" && `Te pasaste por ${money(Math.abs(usage.remaining))}. Ajustemos el resto del mes.`}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </section>
      <form className="panel form-grid" onSubmit={submit}>
        <label>
          Monto
          <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="numeric" />
        </label>
        <label>
          Descripcion
          <input value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <label>
          Categoria
          <select value={category} onChange={(event) => setCategory(event.target.value as ExpenseCategory)}>
            {categoryOptions.map(([key, item]) => (
              <option key={key} value={key}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <button className="primary" type="submit">
          <Plus size={16} /> Agregar gasto
        </button>
      </form>
      {byCategory.length > 0 && (
        <section className="panel">
          <p className="eyebrow">Por categoria</p>
          {byCategory.map(([key, value]) => (
            <div className="category-row" key={key}>
              <span>{categories[key].label}</span>
              <strong>{money(value)}</strong>
            </div>
          ))}
        </section>
      )}
      <div className="list">
        {state.expenses.slice(0, visibleCount).map((expense) => (
          <article className="list-row" key={expense.id}>
            <div>
              <strong>{expense.description}</strong>
              <span>{categories[expense.category].label}</span>
            </div>
            <div className="row-actions">
              <strong>{money(expense.myShare)}</strong>
              <button
                className="icon-button light"
                onClick={() =>
                  setState((current) => ({
                    ...current,
                    expenses: current.expenses.filter((item) => item.id !== expense.id),
                  }))
                }
              >
                <Trash2 size={15} />
              </button>
            </div>
          </article>
        ))}
        {state.expenses.length > visibleCount && (
          <button className="ghost small" onClick={() => setVisibleCount((n) => n + 12)}>
            Ver mas ({state.expenses.length - visibleCount} restantes)
          </button>
        )}
      </div>
    </>
  );
}

function GoalsTab({
  state,
  setState,
}: {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}) {
  const [depositGoalId, setDepositGoalId] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState("");

  function submitDeposit(event: FormEvent) {
    event.preventDefault();
    const amount = Number(depositAmount);
    if (!amount || !depositGoalId) return;
    setState((current) => addToGoal(current, depositGoalId, amount));
    setDepositAmount("");
    setDepositGoalId(null);
  }

  const done = state.goals.filter((g) => goalProgress(g).done).length;

  return (
    <>
      <PageIntro title="Metas" text="Cada peso que separes hoy es un objetivo cumplido manana." />

      {state.goals.length > 0 && (
        <section className="panel goal-summary">
          <p className="eyebrow">Progreso general</p>
          <h3>
            {done}/{state.goals.length} metas cumplidas
          </h3>
        </section>
      )}

      <div className="goal-list">
        {state.goals.map((goal) => {
          const { pct, remaining, done } = goalProgress(goal);
          const isDepositing = depositGoalId === goal.id;
          const daysLeft = goal.deadline ? daysUntilDeadline(goal.deadline) : null;

          return (
            <article className={`panel goal-card ${done ? "done" : ""}`} key={goal.id}>
              <div className="goal-head">
                <div>
                  <strong>{goal.name}</strong>
                  <span>
                    {money(goal.current)} de {money(goal.target)}
                    {daysLeft !== null && (
                      <> · {daysLeft > 0 ? `${daysLeft} dias` : "Vencida"}</>
                    )}
                  </span>
                </div>
                <div className="goal-actions">
                  {done ? (
                    <span className="status-pill claimed">cumplida</span>
                  ) : (
                    <button
                      className="ghost small"
                      onClick={() => setDepositGoalId(isDepositing ? null : goal.id)}
                      type="button"
                    >
                      {isDepositing ? "Cancelar" : "Agregar"}
                    </button>
                  )}
                  <button
                    className="icon-button light"
                    onClick={() =>
                      setState((current) => ({
                        ...current,
                        goals: current.goals.filter((item) => item.id !== goal.id),
                      }))
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div className="progress goal-progress">
                <span style={{ width: `${pct}%` }} />
              </div>
              <p className="goal-pct">
                {done
                  ? "Meta alcanzada."
                  : `${pct.toFixed(0)}% · te faltan ${money(remaining)}`}
              </p>

              {isDepositing && (
                <form className="goal-deposit" onSubmit={submitDeposit}>
                  <input
                    autoFocus
                    inputMode="numeric"
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="Cuanto separs hoy?"
                    value={depositAmount}
                  />
                  <button className="primary" type="submit">
                    Guardar
                  </button>
                </form>
              )}
            </article>
          );
        })}
      </div>

      {state.goals.length === 0 && (
        <p className="empty-note" style={{ textAlign: "center", padding: "24px 0" }}>
          No tenes metas todavia. Crea la primera abajo.
        </p>
      )}

      <GoalForm setState={setState} />
    </>
  );
}

function GoalForm({ setState }: { setState: React.Dispatch<React.SetStateAction<AppState>> }) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    const numericTarget = Number(target);
    if (!name.trim() || !numericTarget) return;
    setState((current) => ({
      ...current,
      goals: [
        ...current.goals,
        {
          id: uid(),
          name: name.trim(),
          target: numericTarget,
          current: 0,
          deadline: deadline || undefined,
        },
      ],
    }));
    setName("");
    setTarget("");
    setDeadline("");
  }

  return (
    <form className="panel form-grid" onSubmit={submit}>
      <p className="eyebrow">Nueva meta</p>
      <label>
        Nombre
        <input
          onChange={(e) => setName(e.target.value)}
          placeholder="Viaje, auto, fondo de emergencia..."
          value={name}
        />
      </label>
      <label>
        Monto objetivo
        <input
          inputMode="numeric"
          onChange={(e) => setTarget(e.target.value)}
          placeholder="Ej: 500000"
          value={target}
        />
      </label>
      <label>
        Fecha limite (opcional)
        <input
          onChange={(e) => setDeadline(e.target.value)}
          type="date"
          value={deadline}
        />
      </label>
      <button className="primary" type="submit">
        <Plus size={16} /> Crear meta
      </button>
    </form>
  );
}

function ProfileTab({
  state,
  setState,
}: {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}) {
  return (
    <>
      <PageIntro title="Yo" text="Cuentas, tarjetas y configuracion." />
      <AccountForm setState={setState} />
      <CardForm setState={setState} />
      <section className="panel">
        <p className="eyebrow">Cuentas</p>
        <div className="list embedded">
          {state.accounts.map((account) => (
            <div className="list-row" key={account.id}>
              <div>
                <strong>{account.institution}</strong>
                <span>{account.kind}</span>
              </div>
              <div className="row-actions">
                <strong>{money(account.balance, state.user?.hidden)}</strong>
                <button
                  className="icon-button light"
                  onClick={() =>
                    setState((current) => ({
                      ...current,
                      accounts: current.accounts.filter((item) => item.id !== account.id),
                    }))
                  }
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
          {state.wallets.map((wallet) => (
            <div className="list-row" key={wallet.id}>
              <div>
                <strong>{wallet.name}</strong>
                <span>{wallet.annualRate}% TNA</span>
              </div>
              <div className="row-actions">
                <strong>{money(wallet.balance, state.user?.hidden)}</strong>
                <button
                  className="icon-button light"
                  onClick={() =>
                    setState((current) => ({
                      ...current,
                      wallets: current.wallets.filter((item) => item.id !== wallet.id),
                    }))
                  }
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="panel">
        <p className="eyebrow">Tarjetas</p>
        <div className="list embedded">
          {state.cards.map((card) => (
            <div className="list-row" key={card.id}>
              <div>
                <strong>
                  {card.issuer} {card.brand}
                </strong>
                <span>vence dia {card.dueDay} · TEA {card.tea}%</span>
              </div>
              <div className="row-actions">
                <strong>{money(card.total, state.user?.hidden)}</strong>
                <button
                  className="icon-button light"
                  onClick={() =>
                    setState((current) => ({
                      ...current,
                      cards: current.cards.filter((item) => item.id !== card.id),
                    }))
                  }
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="panel danger">
        <p className="eyebrow">Zona sensible</p>
        <button
          className="danger-button"
          onClick={() => {
            if (!confirm("Borrar todos los datos locales de Mango?")) return;
            resetState();
            location.reload();
          }}
        >
          Borrar datos locales
        </button>
      </section>
    </>
  );
}

function AccountForm({ setState }: { setState: React.Dispatch<React.SetStateAction<AppState>> }) {
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [kind, setKind] = useState<"bank" | "wallet">("bank");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setState((current) =>
      kind === "bank"
        ? {
            ...current,
            accounts: [
              ...current.accounts,
              { id: uid(), institution: name.trim(), kind: "CA", balance: Number(balance) || 0 },
            ],
          }
        : {
            ...current,
            wallets: [
              ...current.wallets,
              { id: uid(), name: name.trim(), balance: Number(balance) || 0, annualRate: 21 },
            ],
          },
    );
    setName("");
    setBalance("");
  }

  return (
    <form className="panel form-grid" onSubmit={submit}>
      <p className="eyebrow">Agregar cuenta</p>
      <div className="segmented">
        <button className={kind === "bank" ? "active" : ""} onClick={() => setKind("bank")} type="button">
          Banco
        </button>
        <button className={kind === "wallet" ? "active" : ""} onClick={() => setKind("wallet")} type="button">
          Billetera
        </button>
      </div>
      <label>
        Nombre
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="BBVA / Mercado Pago" />
      </label>
      <label>
        Saldo
        <input value={balance} onChange={(event) => setBalance(event.target.value)} inputMode="numeric" />
      </label>
      <button className="primary" type="submit">
        Agregar
      </button>
    </form>
  );
}

function CardForm({ setState }: { setState: React.Dispatch<React.SetStateAction<AppState>> }) {
  const [issuer, setIssuer] = useState("");
  const [brand, setBrand] = useState<"Visa" | "Mastercard" | "Amex" | "Otra">("Visa");
  const [total, setTotal] = useState("");
  const [minimum, setMinimum] = useState("");
  const [dueDay, setDueDay] = useState("20");
  const [tea, setTea] = useState("90");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!issuer.trim()) return;
    setState((current) => ({
      ...current,
      cards: [
        ...current.cards,
        {
          id: uid(),
          issuer: issuer.trim(),
          brand,
          total: Number(total) || 0,
          minimum: Number(minimum) || 0,
          dueDay: Number(dueDay) || 20,
          tea: Number(tea) || 90,
        },
      ],
    }));
    setIssuer("");
    setTotal("");
    setMinimum("");
    setDueDay("20");
    setTea("90");
  }

  return (
    <form className="panel form-grid" onSubmit={submit}>
      <p className="eyebrow">Agregar tarjeta</p>
      <label>
        Banco
        <input value={issuer} onChange={(event) => setIssuer(event.target.value)} placeholder="Galicia" />
      </label>
      <div className="segmented">
        {(["Visa", "Mastercard", "Amex", "Otra"] as const).map((b) => (
          <button className={brand === b ? "active" : ""} key={b} onClick={() => setBrand(b)} type="button">
            {b}
          </button>
        ))}
      </div>
      <label>
        Total a pagar
        <input value={total} onChange={(event) => setTotal(event.target.value)} inputMode="numeric" />
      </label>
      <label>
        Pago minimo
        <input value={minimum} onChange={(event) => setMinimum(event.target.value)} inputMode="numeric" />
      </label>
      <label>
        Dia de vencimiento
        <input value={dueDay} onChange={(event) => setDueDay(event.target.value)} inputMode="numeric" placeholder="20" />
      </label>
      <label>
        TEA % (tasa anual)
        <input value={tea} onChange={(event) => setTea(event.target.value)} inputMode="numeric" placeholder="90" />
      </label>
      <button className="primary" type="submit">
        Agregar tarjeta
      </button>
    </form>
  );
}

function TabBar({ tab, setTab }: { tab: Tab; setTab: (tab: Tab) => void }) {
  const tabs = [
    { id: "home"      as const, label: "Hoy",       icon: Home },
    { id: "expenses"  as const, label: "Gastos",    icon: CreditCard },
    { id: "goals"     as const, label: "Metas",     icon: Target },
    { id: "simulador" as const, label: "Simular",   icon: TrendingUp },
    { id: "learn"     as const, label: "Aprender",  icon: BookOpen },
    { id: "tycoon"    as const, label: "Juego",     icon: Building2 },
    { id: "mercados"  as const, label: "Pro",       icon: Zap, premium: true },
    { id: "profile"   as const, label: "Yo",        icon: UserRound },
  ];
  return (
    <nav className="tabbar">
      {tabs.map((item) => {
        const Icon = item.icon;
        return (
          <button
            className={`${tab === item.id ? "active" : ""} ${item.premium ? "tab-premium" : ""}`}
            key={item.id}
            onClick={() => setTab(item.id)}
          >
            <Icon size={20} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

// ─── Mango Score ─────────────────────────────────────────────────────────────

function computeMangoScore(state: AppState) {
  const health = budgetHealth(state);
  const budgetPts = health.status === "green" ? 250 : health.status === "yellow" ? 120 : 30;

  const spent = monthlyExpenses(state);
  const salary = state.user?.salary || 1;
  const savingsPts = Math.round(Math.max(0, Math.min(1, (salary - spent) / salary)) * 250);

  const done = state.tycoon.completedLessonIds.length;
  const lessonsPts = Math.round((done / Math.max(lessons.length, 1)) * 250);

  const pnlP = simPnlPct(state.simulator);
  const simPts = pnlP >= 20 ? 250 : pnlP >= 10 ? 200 : pnlP >= 0 ? 130 : pnlP >= -10 ? 60 : 10;

  return {
    score: Math.min(1000, budgetPts + savingsPts + lessonsPts + simPts),
    breakdown: { budget: budgetPts, savings: savingsPts, lessons: lessonsPts, sim: simPts },
  };
}

function MangoScoreCard({ state, setTab }: { state: AppState; setTab: (t: Tab) => void }) {
  const { score, breakdown } = useMemo(() => computeMangoScore(state), [state]);
  const color = score >= 700 ? "var(--green)" : score >= 400 ? "var(--amber)" : "var(--red)";
  const label = score >= 700 ? "Inversor Avanzado" : score >= 400 ? "Inversor Intermedio" : "Inversor Novato";
  const R = 40, circumference = 2 * Math.PI * R;
  const arc = circumference * (score / 1000);

  return (
    <section className="panel score-card">
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <svg width="96" height="96" viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
          <circle cx="50" cy="50" r={R} fill="none" stroke="var(--border)" strokeWidth="9" />
          <circle
            cx="50" cy="50" r={R} fill="none"
            stroke={color} strokeWidth="9"
            strokeDasharray={`${arc.toFixed(1)} ${(circumference - arc).toFixed(1)}`}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
          />
          <text x="50" y="47" textAnchor="middle" fill="var(--text)" fontSize="20" fontWeight="800" fontFamily="inherit">{score}</text>
          <text x="50" y="61" textAnchor="middle" fill="var(--muted)" fontSize="9" fontFamily="inherit">/ 1000</text>
        </svg>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="eyebrow" style={{ margin: "0 0 2px" }}>Mango Score</p>
          <strong style={{ display: "block", fontSize: 16, fontWeight: 800 }}>{label}</strong>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px 12px", marginTop: 10 }}>
            <ScorePill label="Presupuesto" pts={breakdown.budget} max={250} />
            <ScorePill label="Ahorro" pts={breakdown.savings} max={250} />
            <ScorePill label="Lecciones" pts={breakdown.lessons} max={250} onClick={() => setTab("learn")} />
            <ScorePill label="Simulador" pts={breakdown.sim} max={250} onClick={() => setTab("simulador")} />
          </div>
        </div>
      </div>
    </section>
  );
}

function ScorePill({ label, pts, max, onClick }: { label: string; pts: number; max: number; onClick?: () => void }) {
  const pct = pts / max;
  const color = pct >= 0.8 ? "var(--green)" : pct >= 0.5 ? "var(--amber)" : "var(--red)";
  return (
    <div style={{ cursor: onClick ? "pointer" : "default" }} onClick={onClick}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10, color: "var(--muted)" }}>{label}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color }}>{pts}</span>
      </div>
      <div style={{ height: 3, background: "var(--border)", borderRadius: 99, marginTop: 2 }}>
        <div style={{ height: 3, width: `${pct * 100}%`, background: color, borderRadius: 99, transition: "width 1.2s ease" }} />
      </div>
    </div>
  );
}

// ─── Arena Semanal ────────────────────────────────────────────────────────────

const ARENA_NAMES = ["Marcos G.", "Laura V.", "Diego H.", "Ana P.", "Carlos M.", "Pablo R.", "Jimena S.", "Rodrigo T.", "Valentina F.", "Matías O."];
const MEDALS = ["👑", "🥈", "🥉"];

function getArenaWeek() {
  const now = new Date();
  const epochWeek = Math.floor(now.getTime() / (7 * 24 * 60 * 60 * 1000));
  const sunday = new Date(now);
  sunday.setDate(now.getDate() + (7 - now.getDay()) % 7 || 7);
  sunday.setHours(23, 59, 59, 0);
  const diff = sunday.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  const s = epochWeek;
  const sorted = [...ARENA_NAMES].sort((a, b) => {
    const h = (x: string, seed: number) => [...x].reduce((acc, c) => (acc * 31 + c.charCodeAt(0) + seed) | 0, 0);
    return h(a, s) - h(b, s);
  });
  const base = [22.1, 17.8, 13.4, 10.2, 8.6];
  const top3 = sorted.slice(0, 3).map((name, i) => ({
    name,
    ret: base[i] + ((s * (i + 7)) % 41) * 0.1,
  }));

  return { weekNum: (epochWeek % 52) + 1, countdown: `${days}d ${hours}h`, top3, totalUsers: 820 + (s % 180) };
}

function ArenaWeekCard({ state, setTab }: { state: AppState; setTab: (t: Tab) => void }) {
  const { weekNum, countdown, top3, totalUsers } = useMemo(getArenaWeek, []);
  const pnlPct = useMemo(() => simPnlPct(state.simulator), [state.simulator]);
  const pnlUsd = useMemo(() => simPnl(state.simulator), [state.simulator]);
  const pos = pnlPct >= 0;

  const rank = useMemo(() => {
    if (pnlPct >= 18) return Math.max(1, Math.floor(totalUsers * 0.03));
    if (pnlPct >= 12) return Math.floor(totalUsers * 0.12);
    if (pnlPct >=  5) return Math.floor(totalUsers * 0.28);
    if (pnlPct >=  0) return Math.floor(totalUsers * 0.52);
    return Math.floor(totalUsers * 0.78);
  }, [pnlPct, totalUsers]);

  const topPct = Math.round((rank / totalUsers) * 100);

  return (
    <section className="panel arena-card">
      <div className="arena-head">
        <div>
          <p className="eyebrow" style={{ margin: "0 0 1px", color: "var(--amber)" }}>⚔️ Arena Semanal</p>
          <strong style={{ fontSize: 15, fontWeight: 800 }}>Semana #{weekNum} · {totalUsers.toLocaleString()} usuarios</strong>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, color: "var(--muted)" }}>Termina en</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "var(--amber)" }}>{countdown}</div>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
        {top3.map((p, i) => (
          <div key={p.name} className="arena-row">
            <span style={{ width: 22, fontSize: 15 }}>{MEDALS[i]}</span>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{p.name}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--green)" }}>+{p.ret.toFixed(1)}%</span>
            <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 6 }}>
              +${(p.ret / 100 * 10000).toFixed(0)}
            </span>
          </div>
        ))}

        <div style={{ borderTop: "1px solid var(--border)", margin: "4px 0" }} />

        <div className="arena-row arena-mine">
          <span style={{ width: 22, fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>#{rank}</span>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 800 }}>Vos</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: pos ? "var(--green)" : "var(--red)" }}>
            {pos ? "+" : ""}{pnlPct.toFixed(1)}%
          </span>
          <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 6 }}>
            {pos ? "+" : ""}{pnlUsd >= 0 ? "" : "-"}${Math.abs(pnlUsd).toFixed(0)}
          </span>
        </div>
        <p style={{ fontSize: 11, color: "var(--muted)", margin: "2px 0 8px" }}>
          Top {topPct}% de la comunidad
          {topPct <= 20 ? " 🔥 Excelente semana" : topPct <= 50 ? " — Seguís sumando" : " — Simulá más para subir 💪"}
        </p>
      </div>

      <button
        className="arena-pro-btn"
        onClick={() => setTab("mercados")}
      >
        <Lock size={12} /> Ver ranking completo · Pro
      </button>
    </section>
  );
}

// ─── BTC Live Chart ──────────────────────────────────────────────────────────

type PricePoint = { t: number; c: number };

const BINANCE_REST = "https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=60";
const BINANCE_WS   = "wss://stream.binance.com/ws/btcusdt@kline_1m";

function BtcLiveChart({ onPrice }: { onPrice: (p: number) => void }) {
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [live, setLive]       = useState(0);
  const [wsOk, setWsOk]       = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const onPriceRef = useRef(onPrice);
  onPriceRef.current = onPrice;

  useEffect(() => {
    let dead = false;

    fetch(BINANCE_REST, { signal: AbortSignal.timeout(8000) })
      .then((r) => r.json())
      .then((rows: number[][]) => {
        if (dead) return;
        setHistory(rows.map(([t, , , , c]) => ({ t, c: Number(c) })));
      })
      .catch(() => {});

    function connect() {
      if (dead) return;
      const w = new WebSocket(BINANCE_WS);
      wsRef.current = w;
      w.onopen  = () => { if (!dead) setWsOk(true); };
      w.onclose = () => { setWsOk(false); if (!dead) setTimeout(connect, 3000); };
      w.onmessage = ({ data }) => {
        try {
          const { k } = JSON.parse(data);
          const price = Number(k.c);
          setLive(price);
          onPriceRef.current(price);
          if (k.x) {
            setHistory((prev) => [...prev.slice(-59), { t: k.t, c: price }]);
          }
        } catch {}
      };
    }
    connect();

    return () => { dead = true; wsRef.current?.close(); };
  }, []);

  const pts = [...history.map((p) => p.c), live].filter(Boolean);
  const currentPrice = live || pts[pts.length - 1] || 0;
  const firstPrice   = pts[0] || currentPrice;
  const change       = firstPrice ? ((currentPrice - firstPrice) / firstPrice) * 100 : 0;
  const positive     = change >= 0;
  const color        = positive ? "var(--green)" : "var(--red)";

  if (pts.length < 2) {
    return (
      <section className="panel btc-chart-panel">
        <div className="btc-chart-header">
          <div>
            <p className="eyebrow" style={{ margin: "0 0 2px" }}>Bitcoin · BTC/USDT</p>
            <strong className="btc-price">Cargando...</strong>
          </div>
        </div>
        <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "var(--muted)", fontSize: 12 }}>Conectando a Binance...</span>
        </div>
      </section>
    );
  }

  const min  = Math.min(...pts);
  const max  = Math.max(...pts);
  const span = max - min || 1;
  const W = 340, H = 80;
  const toX = (i: number) => ((i / (pts.length - 1)) * W).toFixed(1);
  const toY = (p: number) => (H - ((p - min) / span) * (H - 6) - 3).toFixed(1);
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${toX(i)},${toY(p)}`).join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;
  const lastX = toX(pts.length - 1);
  const lastY = toY(pts[pts.length - 1]);

  return (
    <section className="panel btc-chart-panel">
      <div className="btc-chart-header">
        <div>
          <p className="eyebrow" style={{ margin: "0 0 2px", display: "flex", alignItems: "center", gap: 6 }}>
            Bitcoin · BTC/USDT
            <span className={`live-dot${wsOk ? " live-dot--on" : ""}`} />
          </p>
          <strong className="btc-price">
            ${currentPrice.toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </strong>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color, fontWeight: 700, fontSize: 16 }}>
            {positive ? "+" : ""}{change.toFixed(2)}%
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>Última hora</div>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 80, marginTop: 8 }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="btcGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={positive ? "#00BA7C" : "#F4212E"} stopOpacity="0.35" />
            <stop offset="100%" stopColor={positive ? "#00BA7C" : "#F4212E"} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#btcGrad)" />
        <path d={line} fill="none" stroke={positive ? "#00BA7C" : "#F4212E"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={lastX} cy={lastY} r="3.5" fill={positive ? "#00BA7C" : "#F4212E"} />
        {wsOk && <circle cx={lastX} cy={lastY} r="6" fill={positive ? "#00BA7C" : "#F4212E"} opacity="0.25">
          <animate attributeName="r" values="4;10;4" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
        </circle>}
      </svg>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontSize: 10, color: "var(--muted)" }}>60 min</span>
        <span style={{ fontSize: 10, color: wsOk ? "var(--green)" : "var(--muted)" }}>
          {wsOk ? "● EN VIVO" : "○ Reconectando..."}
        </span>
      </div>
    </section>
  );
}

// ─── Simulador ───────────────────────────────────────────────────────────────

function SimulatorTab({
  state,
  setState,
}: {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}) {
  const sim = state.simulator;
  const [view, setView] = useState<"mercado" | "cartera" | "historial">("mercado");
  const [buyAssetId, setBuyAssetId] = useState<string | null>(null);
  const [buyAmount, setBuyAmount] = useState("100");
  const [sellAssetId, setSellAssetId] = useState<string | null>(null);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [priceError, setPriceError] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshPrices = useCallback(async () => {
    setLoadingPrices(true);
    setPriceError(false);
    try {
      const prices = await fetchSimPrices(sim.prices);
      setState((cur) => updateSimPrices(cur, prices));
    } catch {
      setPriceError(true);
    } finally {
      setLoadingPrices(false);
    }
  }, [sim.prices, setState]);

  useEffect(() => {
    refreshPrices();
    intervalRef.current = setInterval(refreshPrices, 60_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const totalValue  = simTotalValue(sim);
  const pnl         = simPnl(sim);
  const pnlPct      = simPnlPct(sim);
  const portfolioVal = simPortfolioValue(sim);

  const buyAssetObj  = SIM_ASSETS.find((a) => a.id === buyAssetId);
  const buyUsd       = Number(buyAmount) || 0;
  const buyQtyPreview = buyAssetObj && sim.prices[buyAssetId!]
    ? buyUsd / sim.prices[buyAssetId!]
    : 0;

  function handleBuy(e: React.FormEvent) {
    e.preventDefault();
    if (!buyAssetId || buyUsd <= 0) return;
    setState((cur) => buySimAsset(cur, buyAssetId, buyUsd));
    setBuyAssetId(null);
    setBuyAmount("100");
  }

  const ago = sim.pricesUpdatedAt
    ? Math.round((Date.now() - sim.pricesUpdatedAt) / 1000)
    : null;

  const handleBtcPrice = useCallback((price: number) => {
    setState((cur) => updateSimPrices(cur, { ...cur.simulator.prices, BTC: price }));
  }, [setState]);

  return (
    <>
      <div className="page-intro">
        <h2>Simulador</h2>
        <p>Invertí con US$10.000 ficticios. Aprendé sin riesgo real.</p>
      </div>

      <BtcLiveChart onPrice={handleBtcPrice} />

      {/* Resumen */}
      <section className="panel">
        <div className="metric-grid">
          <div className="metric">
            <span>Capital total</span>
            <strong>${totalValue.toLocaleString("en-US", { maximumFractionDigits: 2 })}</strong>
          </div>
          <div className={`metric ${pnl >= 0 ? "" : "warn"}`}>
            <span>P&L total</span>
            <strong style={{ color: pnl >= 0 ? "#10b981" : "#ef4444" }}>
              {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)} ({pnlPct.toFixed(2)}%)
            </strong>
          </div>
          <div className="metric">
            <span>Efectivo</span>
            <strong>${sim.cashUsd.toLocaleString("en-US", { maximumFractionDigits: 2 })}</strong>
          </div>
          <div className="metric">
            <span>En activos</span>
            <strong>${portfolioVal.toFixed(2)}</strong>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
          <button className="ghost small" onClick={refreshPrices} disabled={loadingPrices}>
            <RefreshCw size={13} /> {loadingPrices ? "Actualizando..." : "Precios"}
          </button>
          {ago !== null && !loadingPrices && (
            <span className="fine-print">hace {ago < 60 ? `${ago}s` : `${Math.round(ago/60)}m`}</span>
          )}
          {priceError && <span className="fine-print" style={{ color: "#ef4444" }}>Sin conexión — precios demo</span>}
        </div>
      </section>

      {/* Tabs internos */}
      <div className="segmented" style={{ margin: "0 0 12px" }}>
        {(["mercado", "cartera", "historial"] as const).map((v) => (
          <button key={v} className={view === v ? "active" : ""} onClick={() => setView(v)} type="button">
            {v === "mercado" ? "Mercado" : v === "cartera" ? "Mi cartera" : "Historial"}
          </button>
        ))}
      </div>

      {/* ── Vista: Mercado ── */}
      {view === "mercado" && (
        <div className="asset-list">
          {SIM_ASSETS.map((asset) => {
            const price = sim.prices[asset.id] ?? asset.defaultPrice;
            const pos   = sim.positions.find((p) => p.assetId === asset.id);
            return (
              <article className="asset-card" key={asset.id}>
                <div className="asset-topline">
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <strong>{asset.symbol}</strong>
                      <span
                        className="eyebrow"
                        style={{ color: CATEGORY_COLOR[asset.category], background: `${CATEGORY_COLOR[asset.category]}18`, padding: "1px 6px", borderRadius: 99 }}
                      >
                        {CATEGORY_LABEL[asset.category]}
                      </span>
                    </div>
                    <span>{asset.name}</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <strong style={{ fontSize: 15 }}>{formatSimPrice(price)}</strong>
                    {pos && (
                      <div style={{ fontSize: 12, color: "#64748b" }}>
                        Tenés {formatSimQty(pos.quantity, asset.id)}
                      </div>
                    )}
                  </div>
                </div>
                <p style={{ fontSize: 12, color: "#64748b", margin: "6px 0 8px" }}>{asset.lesson}</p>
                <button
                  className="primary"
                  onClick={() => { setBuyAssetId(asset.id); setBuyAmount("100"); }}
                  disabled={sim.cashUsd < 1}
                >
                  <ArrowDownCircle size={14} /> Comprar
                </button>
              </article>
            );
          })}
        </div>
      )}

      {/* ── Vista: Cartera ── */}
      {view === "cartera" && (
        <>
          {sim.positions.length === 0 ? (
            <p className="empty-note" style={{ textAlign: "center", padding: "32px 0" }}>
              No tenés posiciones aún. Comprá algo en "Mercado".
            </p>
          ) : (
            <div className="asset-list">
              {sim.positions.map((pos) => {
                const asset   = SIM_ASSETS.find((a) => a.id === pos.assetId)!;
                const val     = positionValue(pos, sim.prices);
                const pnlP    = positionPnlPct(pos, sim.prices);
                const positive = pnlP >= 0;
                return (
                  <article className="asset-card owned" key={pos.assetId}>
                    <div className="asset-topline">
                      <div>
                        <strong>{asset.symbol} — {asset.name}</strong>
                        <span>{formatSimQty(pos.quantity, asset.id)} unidades</span>
                        <span>Precio promedio: {formatSimPrice(pos.avgBuyPrice)}</span>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <strong>${val.toFixed(2)}</strong>
                        <div style={{ color: positive ? "#10b981" : "#ef4444", fontWeight: 600 }}>
                          {positive ? "+" : ""}{pnlP.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                      {[25, 50, 100].map((pct) => (
                        <button
                          key={pct}
                          className="ghost small"
                          onClick={() => setState((cur) => sellSimAsset(cur, pos.assetId, pct))}
                        >
                          <ArrowUpCircle size={12} /> {pct}%
                        </button>
                      ))}
                    </div>
                    <p style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}>
                      Vender: 25% · 50% · 100% de la posición
                    </p>
                  </article>
                );
              })}
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            <button
              className="danger-button"
              onClick={() => { if (confirm("¿Reiniciar simulador? Empezás de 0 con US$10.000.")) setState((cur) => resetSimulator(cur)); }}
            >
              Reiniciar simulador
            </button>
          </div>
        </>
      )}

      {/* ── Vista: Historial ── */}
      {view === "historial" && (
        <>
          {sim.trades.length === 0 ? (
            <p className="empty-note" style={{ textAlign: "center", padding: "32px 0" }}>
              Sin operaciones todavía.
            </p>
          ) : (
            <div className="list">
              {sim.trades.slice(0, 30).map((trade) => {
                const asset = SIM_ASSETS.find((a) => a.id === trade.assetId);
                return (
                  <article className="list-row" key={trade.id}>
                    <div>
                      <strong style={{ color: trade.side === "buy" ? "#10b981" : "#f59e0b" }}>
                        {trade.side === "buy" ? "▲ COMPRA" : "▼ VENTA"} {trade.assetId}
                      </strong>
                      <span>{new Date(trade.date).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}</span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <strong>${trade.total.toFixed(2)}</strong>
                      <span>{formatSimQty(trade.quantity, trade.assetId)} @ {formatSimPrice(trade.price)}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Modal de compra ── */}
      {buyAssetId && buyAssetObj && (
        <div className="modal-overlay" onClick={() => setBuyAssetId(null)}>
          <form className="panel modal-card" onSubmit={handleBuy} onClick={(e) => e.stopPropagation()}>
            <p className="eyebrow">Comprar {buyAssetObj.symbol}</p>
            <h3>{buyAssetObj.name}</h3>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>
              Precio actual: <strong>{formatSimPrice(sim.prices[buyAssetId] ?? buyAssetObj.defaultPrice)}</strong>
            </p>
            <label>
              Monto en USD ficticio
              <input
                autoFocus
                inputMode="numeric"
                value={buyAmount}
                onChange={(e) => setBuyAmount(e.target.value)}
                placeholder="100"
              />
            </label>
            {buyUsd > 0 && (
              <p style={{ fontSize: 13, color: "#64748b" }}>
                Recibirías ≈ {formatSimQty(buyQtyPreview, buyAssetId)} {buyAssetObj.symbol}
              </p>
            )}
            <p style={{ fontSize: 12, color: "#64748b" }}>
              Disponible: ${sim.cashUsd.toFixed(2)}
            </p>
            {buyUsd > sim.cashUsd && (
              <p style={{ color: "#ef4444", fontSize: 13 }}>No tenés suficiente efectivo</p>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button className="primary" type="submit" disabled={buyUsd <= 0 || buyUsd > sim.cashUsd}>
                Confirmar compra
              </button>
              <button className="ghost" type="button" onClick={() => setBuyAssetId(null)}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

// ─── Mercados Premium ─────────────────────────────────────────────────────────

function MercadosTab({ setTab }: { setTab: (tab: Tab) => void }) {
  const features = [
    { icon: "📡", title: "Señales IA en tiempo real", desc: "El modelo detecta régimen de mercado y genera señales sobre MERVAL, ADRs y bonos cada 30 segundos." },
    { icon: "📊", title: "Terminal de trading", desc: "Gráficos de velas, volumen y análisis técnico sobre todos los instrumentos argentinos." },
    { icon: "🤖", title: "Modelo ZenithNetV2", desc: "8.4M parámetros: Transformer + CNN multi-escala. Estimación de incertidumbre por señal." },
    { icon: "💼", title: "Portfolio institucional", desc: "Seguimiento de cartera real con cálculo de Sharpe, drawdown y exposición por régimen." },
  ];
  return (
    <>
      <div className="page-intro">
        <h2>Mercados Pro</h2>
        <p>Herramientas avanzadas para cuando ya tengas base. Nada de esto es necesario para empezar.</p>
      </div>

      <section className="panel" style={{ textAlign: "center", padding: "24px 16px" }}>
        <Lock size={32} style={{ color: "#f59e0b", margin: "0 auto 12px" }} />
        <h3>Próximamente</h3>
        <p style={{ color: "#64748b", fontSize: 14, marginBottom: 16 }}>
          Estamos construyendo la plataforma premium. Mientras tanto, aprendé con el simulador gratuito y cuando te sientas listo, esto va a tener mucho más sentido.
        </p>
        <button className="ghost" onClick={() => setTab("simulador")}>
          Ir al simulador gratuito →
        </button>
      </section>

      <p className="eyebrow" style={{ padding: "0 4px", marginBottom: 8 }}>Qué incluye Pro</p>
      <div className="asset-list">
        {features.map((f) => (
          <article className="asset-card" key={f.title} style={{ opacity: 0.7 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span style={{ fontSize: 24 }}>{f.icon}</span>
              <div>
                <strong>{f.title}</strong>
                <p style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{f.desc}</p>
              </div>
            </div>
          </article>
        ))}
      </div>

      <section className="panel muted" style={{ marginTop: 8 }}>
        <ShieldCheck size={18} style={{ color: "#10b981" }} />
        <p style={{ fontSize: 13 }}>
          Todo lo educativo — simulador, lecciones, tycoon, gestión de gastos — es y será siempre gratuito. Pro solo agrega herramientas para quienes ya operan en el mercado real.
        </p>
      </section>
    </>
  );
}

function Brand() {
  return (
    <div className="brand">
      <span>M</span>
      <div>
        <strong>Mango</strong>
        <small>hace que rinda</small>
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "warn" }) {
  return (
    <div className={`metric ${tone ?? ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PageIntro({ title, text }: { title: string; text: string }) {
  return (
    <div className="page-intro">
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
}
