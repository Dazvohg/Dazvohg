import {
  BarChart3,
  BookOpen,
  CreditCard,
  Eye,
  EyeOff,
  Home,
  Landmark,
  LineChart,
  Plus,
  RefreshCw,
  ShieldCheck,
  Target,
  Trash2,
  UserRound,
  WalletCards,
  Building2,
  Coins,
  Trophy,
} from "lucide-react";
import type React from "react";
import { FormEvent, useEffect, useMemo, useState } from "react";
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
  tycoonAssets,
  tycoonNetWorth,
} from "../domain/tycoon";
import { fetchRates } from "../services/liveData";
import { resetState } from "../services/storage";
import { usePersistentState } from "./usePersistentState";

type Tab = "home" | "invest" | "learn" | "tycoon" | "expenses" | "goals" | "profile";

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
        {tab === "home" && <HomeTab state={state} setState={setState} setTab={setTab} />}
        {tab === "invest" && <InvestTab state={state} setState={setState} />}
        {tab === "learn" && <LearnTab state={state} setState={setState} />}
        {tab === "tycoon" && <TycoonTab state={state} setState={setState} />}
        {tab === "expenses" && <ExpensesTab state={state} setState={setState} />}
        {tab === "goals" && <GoalsTab state={state} setState={setState} />}
        {tab === "profile" && <ProfileTab state={state} setState={setState} />}
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
        <button className="quick-card" onClick={() => setTab("invest")}>
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

function TycoonTab({
  state,
  setState,
}: {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}) {
  const objectives = availableObjectives(state);
  const owned = state.tycoon.ownedAssets
    .map((item) => ({ owned: item, asset: tycoonAssets.find((asset) => asset.id === item.assetId) }))
    .filter((item): item is { owned: (typeof state.tycoon.ownedAssets)[number]; asset: (typeof tycoonAssets)[number] } => Boolean(item.asset));
  const completed = objectives.filter((objective) => objective.completedAt).length;

  return (
    <>
      <PageIntro
        title="Mango Tycoon"
        text="El juego interno de Mango: cumplis habitos reales, ganas Mangos y construis tu imperio argentino."
      />
      <section className="tycoon-hero">
        <div>
          <p className="eyebrow">Modo juego</p>
          <h3>{state.tycoon.mangoCash.toLocaleString("es-AR")} Mangos</h3>
          <p>{realWorldBridge(state)}</p>
        </div>
        <Coins size={42} />
      </section>

      <section className="panel game-rules">
        <p className="eyebrow">Como se juega</p>
        <div className="rules-grid">
          <div><strong>1</strong><span>Cumpli misiones reales</span></div>
          <div><strong>2</strong><span>Cobra Mangos ficticios</span></div>
          <div><strong>3</strong><span>Compra propiedades y empresas</span></div>
          <div><strong>4</strong><span>Cobra rentas y aprende finanzas</span></div>
        </div>
      </section>

      <div className="tycoon-stats">
        <Metric label="Patrimonio juego" value={`${tycoonNetWorth(state).toLocaleString("es-AR")} M`} />
        <Metric label="Activos" value={`${owned.length}`} />
        <Metric label="Misiones" value={`${completed}/${objectives.length}`} />
      </div>

      <section className="panel">
        <div className="section-title">
          <div>
            <p className="eyebrow">Misiones</p>
            <h3>Habitos que pagan</h3>
          </div>
          <Trophy color="#C9742A" />
        </div>
        <div className="mission-list">
          {objectives.map((objective) => {
            const alreadyClaimed = state.tycoon.completedObjectiveIds.includes(objective.id);
            const canClaim = Boolean(objective.completedAt) && !alreadyClaimed;
            return (
              <article className={`mission ${objective.completedAt ? "done" : ""}`} key={objective.id}>
                <div>
                  <strong>{objective.title}</strong>
                  <span>
                    {objective.cadence} · +{objective.reward.toLocaleString("es-AR")} Mangos
                  </span>
                  <p>{objective.lesson}</p>
                </div>
                {canClaim ? (
                  <button className="primary compact" onClick={() => setState((current) => completeObjective(current, objective.id))}>
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
            {owned.map(({ owned, asset }) => {
              const collectedToday = owned.rentCollectedAt?.startsWith(new Date().toISOString().slice(0, 10));
              return (
                <article className="asset-card owned" key={owned.id}>
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
                    onClick={() => setState((current) => collectRent(current, owned.id))}
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
    { id: "home" as const, label: "Hoy", icon: Home },
    { id: "expenses" as const, label: "Gastos", icon: CreditCard },
    { id: "goals" as const, label: "Metas", icon: Target },
    { id: "invest" as const, label: "Invertir", icon: LineChart },
    { id: "learn" as const, label: "Aprender", icon: BookOpen },
    { id: "tycoon" as const, label: "Juego", icon: Building2 },
    { id: "profile" as const, label: "Yo", icon: UserRound },
  ];
  return (
    <nav className="tabbar">
      {tabs.map((item) => {
        const Icon = item.icon;
        return (
          <button
            className={tab === item.id ? "active" : ""}
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
