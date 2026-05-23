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
  X,
  Users,
  Copy,
  Check,
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
  goalProjection,
  money,
  monthlyExpenses,
  netWorth,
  netWorthGrowth,
  riskPortfolios,
  totalDebt,
  totalLiquid,
  uid,
} from "../domain/finance";
import type { AppState, ExpenseCategory, OnboardingGoal, RiskLevel, SimAssetCategory } from "../domain/types";
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
import { fetchRates, fetchLiveData } from "../services/liveData";
import { fetchSimPrices } from "../services/prices";
import { resetState } from "../services/storage";
import { supabase } from "../services/supabase";
import { deleteRemoteState } from "../services/db";
import { getIsPro, createCheckout } from "../services/billing";
import {
  createGroup, joinGroupByToken, getMyGroup, leaveGroup,
  getGroupMembers, getGroupExpenses, addGroupExpense, deleteGroupExpense,
  computeBalance,
} from "../services/groups";
import type { GroupExpense, GroupMember, SharedGroup } from "../domain/types";
import { usePersistentState } from "./usePersistentState";

type Tab = "home" | "simulador" | "learn" | "tycoon" | "expenses" | "goals" | "mercados" | "profile" | "grupo";

const categoryOptions = Object.entries(categories) as Array<
  [ExpenseCategory, { label: string; color: string }]
>;

// Cuántas decisiones de Tycoon desbloquea cada lección (estático)
const LESSON_UNLOCK_COUNT = (() => {
  const m: Record<string, number> = {};
  for (const ev of GAME_EVENTS) {
    for (const ch of ev.choices) {
      if (ch.requiredLessonId) m[ch.requiredLessonId] = (m[ch.requiredLessonId] ?? 0) + 1;
    }
  }
  return m;
})();

// ── Donut chart de gastos ──────────────────────────────────────────────────────
function SpendingDonut({
  byCategory,
  total,
}: {
  byCategory: [ExpenseCategory, number][];
  total: number;
}) {
  const r = 60;
  const circ = 2 * Math.PI * r;
  let acc = 0;
  const slices = byCategory.slice(0, 7).map(([key, value]) => {
    const pct = value / total;
    const slice = { key, value, pct, dashLen: pct * circ, offset: acc, color: categories[key].color };
    acc += pct * circ;
    return slice;
  });
  const displayTotal = total >= 1_000_000
    ? `${(total / 1_000_000).toFixed(1)}M`
    : total >= 1000
    ? `${Math.round(total / 1000)}K`
    : `${total}`;

  return (
    <div className="spending-donut-wrap">
      <svg width="160" height="160" viewBox="0 0 160 160" style={{ flex: "0 0 160px" }}>
        <circle cx="80" cy="80" r={r} fill="none" stroke="var(--border)" strokeWidth="22" />
        {slices.map((s) => (
          <circle
            key={s.key}
            cx="80"
            cy="80"
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth="22"
            strokeDasharray={`${s.dashLen} ${circ - s.dashLen}`}
            strokeDashoffset={-s.offset}
            transform="rotate(-90 80 80)"
          />
        ))}
        <text x="80" y="75" textAnchor="middle" fill="var(--text)" fontSize="15" fontWeight="800">
          ${displayTotal}
        </text>
        <text x="80" y="92" textAnchor="middle" fill="var(--muted)" fontSize="11">
          este mes
        </text>
      </svg>
      <div className="spending-legend">
        {slices.map((s) => (
          <div key={s.key} className="legend-row">
            <span className="legend-dot" style={{ background: s.color }} />
            <span className="legend-label">{categories[s.key].label}</span>
            <span className="legend-pct">{(s.pct * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const RATES_INTERVAL_MS    = 5  * 60 * 1000;  // 5 minutos  — el blue/MEP se mueve durante el día
const LIVE_DATA_INTERVAL_MS = 30 * 60 * 1000;  // 30 minutos — inflación y riesgo país no cambian a cada rato

export function App() {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(!!supabase);
  const [guestMode,   setGuestMode]   = useState(!supabase); // true si no hay Supabase configurado
  const [isPro,       setIsPro]       = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setAuthUserId(data.session?.user?.id ?? null);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_ev, session) => {
      setAuthUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload isPro when auth changes
  useEffect(() => {
    if (!authUserId) { setIsPro(false); return; }
    getIsPro(authUserId).then(setIsPro);
  }, [authUserId]);

  // Handle checkout redirect result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success" && authUserId) {
      getIsPro(authUserId).then(setIsPro);
      window.history.replaceState({}, "", window.location.pathname);
    }
    // Handle group invite link: ?join=TOKEN
    if (params.get("join")) {
      setPendingGroupToken(params.get("join")!);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [authUserId]);

  const [pendingGroupToken, setPendingGroupToken] = useState<string | null>(null);

  const userId = guestMode ? undefined : (authUserId ?? undefined);

  const [state, setState] = usePersistentState(userId);
  const [tab, setTab] = useState<Tab>("home");

  const refreshRates = useCallback(() => {
    fetchRates(state.rates).then((rates) => {
      if (rates !== state.rates) setState((current) => ({ ...current, rates }));
    });
  }, [state.rates, setState]);

  const refreshLive = useCallback(() => {
    fetchLiveData(state.live).then((live) => {
      setState((current) => ({ ...current, live }));
    });
  }, [state.live, setState]);

  // Fetch inicial + refresh periódico mientras la app esté abierta
  useEffect(() => {
    if (!state.user) return;
    refreshRates();
    refreshLive();
    const ratesTimer = setInterval(refreshRates, RATES_INTERVAL_MS);
    const liveTimer  = setInterval(refreshLive,  LIVE_DATA_INTERVAL_MS);
    return () => {
      clearInterval(ratesTimer);
      clearInterval(liveTimer);
    };
  }, [state.user]);  // eslint-disable-line react-hooks/exhaustive-deps

  // Snapshot de patrimonio neto: se registra cuando cambia el mes del juego o al inicio
  useEffect(() => {
    if (!state.user) return;
    const today = new Date().toISOString().slice(0, 10);
    const history = state.netWorthHistory ?? [];
    const lastEntry = history[history.length - 1];
    if (lastEntry?.date === today) return; // ya hay snapshot hoy
    const value = netWorth(state);
    setState((current) => ({
      ...current,
      netWorthHistory: [...(current.netWorthHistory ?? []), { date: today, value }],
    }));
  }, [state.user, state.tycoon.gameMonth, state.tycoon.gameYear, state.rates.updatedAt]);  // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSignOut() {
    if (authUserId) await deleteRemoteState(authUserId);
    await supabase?.auth.signOut();
    resetState();
    location.reload();
  }

  // Gates de autenticación
  if (authLoading) return <AuthSplash />;
  if (!guestMode && !authUserId) {
    return <AuthScreen onGuest={() => setGuestMode(true)} />;
  }

  if (!state.user) return <Onboarding setState={setState} setTab={setTab} />;

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
        {tab === "mercados"  && <MercadosTab state={state} setTab={setTab} />}
        {tab === "profile"   && <ProfileTab state={state} setState={setState} authUserId={authUserId} isPro={isPro} onSignOut={handleSignOut} onUpgrade={() => setShowUpgrade(true)} />}
        {tab === "grupo"     && <GroupTab authUserId={authUserId} displayName={state.user?.name ?? "Yo"} pendingToken={pendingGroupToken} onTokenConsumed={() => setPendingGroupToken(null)} rates={state.rates} />}
      </main>
      <TabBar tab={tab} setTab={setTab} />
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} isPro={isPro} />}
    </div>
  );
}

// ─── UpgradeModal ─────────────────────────────────────────────────────────────

function UpgradeModal({ onClose, isPro }: { onClose: () => void; isPro: boolean }) {
  const [loading, setLoading] = useState<"mp" | "stripe" | null>(null);
  const [error, setError]     = useState<string | null>(null);

  async function handleCheckout(provider: "mercadopago" | "stripe") {
    setLoading(provider === "mercadopago" ? "mp" : "stripe");
    setError(null);
    try {
      await createCheckout(provider, "monthly");
    } catch (e) {
      setError((e as Error).message);
      setLoading(null);
    }
  }

  return (
    <div className="legal-overlay" onClick={onClose}>
      <div
        className="upgrade-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)",
          borderRadius: 20,
          padding: 28,
          maxWidth: 360,
          width: "90%",
          margin: "auto",
          position: "relative",
          top: "50%",
          transform: "translateY(-50%)",
        }}
      >
        <button
          className="icon-button light"
          style={{ position: "absolute", top: 14, right: 14 }}
          onClick={onClose}
        >
          <X size={18} />
        </button>

        {isPro ? (
          <>
            <p style={{ fontSize: 28, margin: "0 0 8px" }}>🥭</p>
            <h3 style={{ margin: "0 0 6px" }}>Ya sos Pro</h3>
            <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>
              Tu suscripción está activa. Disfrutá todos los beneficios.
            </p>
          </>
        ) : (
          <>
            <p style={{ fontSize: 28, margin: "0 0 8px" }}>⭐</p>
            <h3 style={{ margin: "0 0 4px" }}>Mango Pro</h3>
            <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 18 }}>
              Sincronizá desde cualquier dispositivo, exportá tus datos y desbloqueá el historial completo.
            </p>

            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px", display: "flex", flexDirection: "column", gap: 8 }}>
              {["☁️ Sync en la nube", "📊 Historial ilimitado", "📥 Exportar a CSV", "🔔 Alertas de patrimonio"].map((f) => (
                <li key={f} style={{ fontSize: 14 }}>{f}</li>
              ))}
            </ul>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                className="primary"
                disabled={!!loading}
                onClick={() => handleCheckout("mercadopago")}
                style={{ position: "relative" }}
              >
                {loading === "mp" ? "Redirigiendo…" : "💳 Pagar con MercadoPago · $499/mes"}
              </button>
              <button
                className="ghost"
                disabled={!!loading}
                onClick={() => handleCheckout("stripe")}
              >
                {loading === "stripe" ? "Redirigiendo…" : "🌎 Pagar con Stripe · USD 2.99/mes"}
              </button>
            </div>

            {error && (
              <p style={{ color: "#ef4444", fontSize: 12, marginTop: 10, textAlign: "center" }}>{error}</p>
            )}

            <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 12, textAlign: "center", lineHeight: 1.5 }}>
              Sin contratos. Cancelás cuando quieras desde la app de cada plataforma.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Onboarding multi-step ────────────────────────────────────────────────────

type OnboardStep = 1 | 2 | 3;

const GOALS: Array<{ id: OnboardingGoal; emoji: string; title: string; desc: string }> = [
  { id: "finanzas", emoji: "💰", title: "Mis finanzas",  desc: "Gastos, metas y patrimonio" },
  { id: "invertir", emoji: "📈", title: "Invertir",      desc: "Mercados reales, sin riesgo" },
  { id: "tycoon",   emoji: "🎮", title: "Tycoon",        desc: "Aprendé tomando decisiones" },
  { id: "todo",     emoji: "✨", title: "Todo junto",    desc: "La experiencia completa" },
];

const RISK_OPTIONS: Array<{ id: RiskLevel; emoji: string; title: string; desc: string }> = [
  { id: "conservador", emoji: "🛡️", title: "Conservador", desc: "Protejo lo que tengo, prefiero bajo riesgo" },
  { id: "moderado",    emoji: "⚖️", title: "Moderado",    desc: "Crezco con equilibrio entre seguridad y retorno" },
  { id: "agresivo",    emoji: "🚀", title: "Agresivo",    desc: "Acepto volatilidad para maximizar el retorno" },
];

function StepDots({ current }: { current: OnboardStep }) {
  return (
    <div className="step-dots">
      {([1, 2, 3] as OnboardStep[]).map((n) => (
        <span key={n} className={`step-dot${current === n ? " active" : ""}`} />
      ))}
    </div>
  );
}

function Onboarding({
  setState,
  setTab,
}: {
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  setTab: (t: Tab) => void;
}) {
  const [step,       setStep]      = useState<OnboardStep>(1);
  const [goal,       setGoal]      = useState<OnboardingGoal>("todo");
  const [name,       setName]      = useState("");
  const [salary,     setSalary]    = useState("1500000");
  const [payday,     setPayday]    = useState("28");
  const [riskLevel,  setRiskLevel] = useState<RiskLevel>("moderado");
  const [accepted,   setAccepted]  = useState(false);
  const [legalModal, setLegalModal] = useState<"tos" | "privacy" | null>(null);

  function goToStep2() {
    // Sugerir perfil de riesgo según objetivo elegido
    if (goal === "finanzas") setRiskLevel("conservador");
    else setRiskLevel("moderado");
    setStep(2);
  }

  function finish(e: FormEvent) {
    e.preventDefault();
    if (!accepted) return;
    const now = new Date().toISOString();
    setState((s) => ({
      ...s,
      user: {
        name:             name.trim() || "Vos",
        salary:           Number(salary) || 0,
        payday:           Number(payday) || 28,
        riskLevel,
        goal,
        hidden:           false,
        createdAt:        now,
        acceptedTermsAt:  now,
      },
    }));
    if (goal === "invertir") setTab("simulador");
    else if (goal === "tycoon") setTab("tycoon");
  }

  const riskTip: Record<typeof goal, string> = {
    finanzas: "Para ordenar tus finanzas, empezar conservador es lo más común.",
    invertir: "El simulador ajusta los portfolios recomendados a tu perfil.",
    tycoon:   "El Tycoon presenta eventos acordes a tu perfil de riesgo.",
    todo:     "Podés cambiar tu perfil cuando quieras desde la sección Perfil.",
  };

  return (
    <div className="onboarding">
      {/* Cabecera compacta con logo y dots */}
      <div className="onboard-header">
        <Brand />
        <StepDots current={step} />
      </div>

      {/* ── Step 1: Objetivo ── */}
      {step === 1 && (
        <div className="onboard-body step-anim">
          <div className="step-header">
            <h2>¿Para qué vas a usar Mango?</h2>
            <p>Elegí tu objetivo principal. Después podés usar todo.</p>
          </div>

          <div className="goal-grid">
            {GOALS.map((g) => (
              <button
                key={g.id}
                type="button"
                className={`goal-card${goal === g.id ? " selected" : ""}`}
                onClick={() => setGoal(g.id)}
              >
                <span className="goal-emoji">{g.emoji}</span>
                <span className="goal-title">{g.title}</span>
                <span className="goal-desc">{g.desc}</span>
              </button>
            ))}
          </div>

          <button className="primary" onClick={goToStep2}>
            Siguiente →
          </button>
        </div>
      )}

      {/* ── Step 2: Perfil básico ── */}
      {step === 2 && (
        <form className="onboard-body step-anim" onSubmit={(e) => { e.preventDefault(); setStep(3); }}>
          <div className="step-header">
            <h2>Tu perfil</h2>
            <p>Solo necesitamos lo básico para personalizar Mango.</p>
          </div>

          <div className="step-form">
            <label>
              Nombre o apodo
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Brian"
                autoFocus
              />
            </label>
            <label>
              Sueldo neto mensual (ARS)
              <input
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                inputMode="numeric"
                placeholder="1500000"
              />
            </label>
            <label>
              Día de cobro
              <input
                value={payday}
                onChange={(e) => setPayday(e.target.value)}
                inputMode="numeric"
                placeholder="28"
              />
            </label>
          </div>

          <div className="step-nav">
            <button type="button" className="ghost" onClick={() => setStep(1)}>← Volver</button>
            <button type="submit" className="primary">Siguiente →</button>
          </div>
        </form>
      )}

      {/* ── Step 3: Perfil de riesgo + aceptación legal ── */}
      {step === 3 && (
        <form className="onboard-body step-anim" onSubmit={finish}>
          <div className="step-header">
            <h2>Tu estilo inversor</h2>
            <p>{riskTip[goal]}</p>
          </div>

          <div className="risk-cards">
            {RISK_OPTIONS.map((r) => (
              <button
                key={r.id}
                type="button"
                className={`risk-card${riskLevel === r.id ? " selected" : ""}`}
                onClick={() => setRiskLevel(r.id)}
              >
                <span className="risk-icon">{r.emoji}</span>
                <div className="risk-info">
                  <strong>{r.title}</strong>
                  <span>{r.desc}</span>
                </div>
                {riskLevel === r.id && (
                  <span style={{ marginLeft: "auto", color: "var(--blue)", fontSize: 18 }}>✓</span>
                )}
              </button>
            ))}
          </div>

          <label className="legal-check">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
            />
            <span>
              Leí y acepto los{" "}
              <button type="button" className="link-btn" onClick={() => setLegalModal("tos")}>
                Términos de Servicio
              </button>{" "}
              y la{" "}
              <button type="button" className="link-btn" onClick={() => setLegalModal("privacy")}>
                Política de Privacidad
              </button>
              . Entiendo que Mango es educativo y no constituye asesoramiento financiero.
            </span>
          </label>

          <div className="step-nav">
            <button type="button" className="ghost" onClick={() => setStep(2)}>← Volver</button>
            <button type="submit" className="primary" disabled={!accepted}>¡Empezar! 🎉</button>
          </div>
        </form>
      )}

      {legalModal && <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />}
    </div>
  );
}

// ─── Legal ───────────────────────────────────────────────────────────────────

const CONTACT_EMAIL = "hola@usemango.app";
const TERMS_DATE    = "Mayo 2026";

function TosContent() {
  return (
    <div className="legal-text">
      <p className="legal-updated">Última actualización: {TERMS_DATE}</p>

      <h3>1. Servicio educativo</h3>
      <p>Mango es una aplicación de educación financiera personal. La información, precios, tasas y proyecciones que muestra son de carácter exclusivamente educativo e informativo. No somos un broker, banco, asesor financiero ni entidad regulada.</p>

      <h3>2. No asesoramiento financiero</h3>
      <p>Nada en Mango constituye asesoramiento financiero, bursátil, legal ni impositivo. Los datos mostrados no deben interpretarse como recomendaciones de inversión. Consultá a un profesional habilitado (asesor financiero, contador, abogado) antes de tomar decisiones financieras reales.</p>

      <h3>3. Exactitud de la información</h3>
      <p>Los precios y tasas provienen de APIs públicas (dolarapi.com, CoinGecko, Yahoo Finance, BCRA) y pueden presentar demoras, diferencias o errores respecto al mercado real. Mango no garantiza la exactitud, completitud ni disponibilidad de estos datos en ningún momento.</p>

      <h3>4. Simulador de inversiones</h3>
      <p>El simulador opera con dinero ficticio. Las ganancias o pérdidas que se muestran no tienen valor económico real, no pueden retirarse ni transferirse. Su único fin es educativo y de práctica.</p>

      <h3>5. Elegibilidad</h3>
      <p>Al usar Mango confirmás que tenés 18 años o más, o que contás con la autorización expresa de tu tutor legal para utilizar la aplicación.</p>

      <h3>6. Uso aceptable</h3>
      <p>No podés usar Mango para actividades ilegales, fraudulentas ni para inducir a error a terceros. Está prohibido intentar acceder a datos de otros usuarios o comprometer la seguridad de la aplicación.</p>

      <h3>7. Propiedad intelectual</h3>
      <p>El código, diseño, textos y contenido educativo de Mango son propiedad de sus creadores. Podés usar la aplicación para tu uso personal pero no podés reproducir ni distribuir su contenido sin autorización.</p>

      <h3>8. Limitación de responsabilidad</h3>
      <p>En ningún caso Mango ni sus creadores serán responsables por pérdidas financieras, daños directos, indirectos, incidentales o consecuentes derivados del uso de la aplicación o de decisiones tomadas en base a su información.</p>

      <h3>9. Modificaciones</h3>
      <p>Podemos actualizar estos Términos con aviso previo en la aplicación. El uso continuado implica aceptación de los nuevos términos.</p>

      <h3>10. Contacto</h3>
      <p><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
    </div>
  );
}

function PrivacyContent() {
  return (
    <div className="legal-text">
      <p className="legal-updated">Última actualización: {TERMS_DATE}</p>

      <h3>1. Información que recopilamos</h3>
      <p><strong>Datos que vos ingresás:</strong> nombre o apodo, sueldo, gastos, presupuestos, metas y objetivos financieros. Esta información nunca sale de tu dispositivo salvo que inicies sesión voluntariamente.</p>
      <p><strong>Datos de cuenta (opcional):</strong> si te registrás, recopilamos tu dirección de email y un ID de usuario único generado por Supabase Auth.</p>
      <p><strong>Datos técnicos:</strong> no recopilamos analytics de comportamiento, no usamos cookies de seguimiento ni fingerprinting.</p>

      <h3>2. Cómo usamos la información</h3>
      <p>Exclusivamente para brindar y personalizar el servicio de Mango. No usamos tus datos para publicidad, no los cruzamos con bases de datos externas ni los vendemos o cedemos a terceros con fines comerciales.</p>

      <h3>3. Almacenamiento</h3>
      <p><strong>Sin cuenta:</strong> todos los datos se guardan solo en el almacenamiento local de tu dispositivo (localStorage). Si borrás los datos del navegador o la app, la información se pierde.</p>
      <p><strong>Con cuenta:</strong> los datos se sincronizan con Supabase, un servicio de base de datos en la nube con cifrado en tránsito (TLS 1.3) y en reposo (AES-256). Los servidores de Supabase están ubicados en la Unión Europea.</p>

      <h3>4. Compartición de datos</h3>
      <p>No vendemos, alquilamos ni cedemos tus datos personales a ningún tercero. Podemos compartir estadísticas agregadas y completamente anonimizadas (sin identificadores personales) para reportes internos.</p>

      <h3>5. Tus derechos</h3>
      <p>Tenés derecho a acceder, corregir y eliminar tus datos en cualquier momento. Para eliminarlos completamente: <strong>Mi perfil → Zona sensible → Borrar cuenta y datos</strong>. Para consultas: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>

      <h3>6. Seguridad</h3>
      <p>Implementamos medidas técnicas razonables para proteger tu información. Sin embargo, ningún sistema es 100% seguro. Te recomendamos usar contraseñas fuertes y no compartir tu acceso.</p>

      <h3>7. Menores de edad</h3>
      <p>Mango no está dirigido a menores de 18 años. Si tenemos conocimiento de que un menor usa la aplicación sin autorización, eliminaremos su cuenta y datos.</p>

      <h3>8. Cambios a esta política</h3>
      <p>Notificaremos cambios significativos a través de la aplicación con al menos 15 días de anticipación.</p>

      <h3>9. Contacto</h3>
      <p><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
    </div>
  );
}

function LegalModal({ type, onClose }: { type: "tos" | "privacy"; onClose: () => void }) {
  const title = type === "tos" ? "Términos de Servicio" : "Política de Privacidad";
  return (
    <div className="legal-overlay">
      <div className="legal-topbar">
        <button className="ghost small" onClick={onClose}>← Volver</button>
        <strong style={{ fontSize: 14 }}>{title}</strong>
        <div style={{ width: 60 }} />
      </div>
      <div className="legal-scroll">
        {type === "tos" ? <TosContent /> : <PrivacyContent />}
      </div>
    </div>
  );
}

// ─── Auth Splash (cargando sesión) ────────────────────────────────────────────
function AuthSplash() {
  return (
    <div className="onboarding" style={{ justifyContent: "center", alignItems: "center" }}>
      <Brand />
      <p style={{ color: "var(--muted)", marginTop: 16, fontSize: 14 }}>Cargando…</p>
    </div>
  );
}

// ─── Auth Screen ──────────────────────────────────────────────────────────────
function AuthScreen({ onGuest }: { onGuest: () => void }) {
  const [email,   setEmail]   = useState("");
  const [sent,    setSent]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  async function handleMagicLink(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !supabase) return;
    setLoading(true);
    setError("");
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setSent(true);
  }

  async function handleGoogle() {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  }

  return (
    <div className="onboarding">
      <section className="hero">
        <Brand />
        <h1>Tu plata, en orden.</h1>
        <p>Creá una cuenta para guardar tu progreso en la nube y acceder desde cualquier dispositivo.</p>
      </section>

      {sent ? (
        <div className="panel" style={{ textAlign: "center" }}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>📬</p>
          <strong style={{ fontSize: 16 }}>Revisá tu email</strong>
          <p style={{ color: "var(--muted)", marginTop: 8, fontSize: 14 }}>
            Enviamos un link a <strong>{email}</strong>.<br />
            Hacé click en el link para ingresar.
          </p>
        </div>
      ) : (
        <form className="panel setup" onSubmit={handleMagicLink}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
            />
          </label>
          {error && <p style={{ color: "var(--red)", fontSize: 12 }}>{error}</p>}
          <button className="primary" type="submit" disabled={loading}>
            {loading ? "Enviando…" : "Entrar con email"}
          </button>
          <button
            type="button"
            className="ghost"
            onClick={handleGoogle}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continuar con Google
          </button>
          <p style={{ textAlign: "center", marginTop: 4 }}>
            <button type="button" className="link-btn" onClick={onGuest}>
              Continuar sin cuenta →
            </button>
          </p>
          <p className="fine-print" style={{ textAlign: "center", color: "var(--muted)" }}>
            Sin contraseña · Link de acceso por email
          </p>
        </form>
      )}
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

function MacroPanel({ live, rates }: { live: AppState["live"]; rates: AppState["rates"] }) {
  const { inflationMonthly, inflationAnnual, countryRisk, source, countryRiskSource } = live;
  if (inflationMonthly == null) return null;

  const fciTNA = (live.badlarTNA ?? 38) * 1.06;
  const fciMonthly = +(fciTNA / 12).toFixed(2);
  const fciIsLive = live.ratesSource === "live";
  const realReturn = +(fciMonthly - inflationMonthly).toFixed(1);
  const positive = realReturn >= 0;

  const riskLabel =
    (countryRisk ?? 0) < 500 ? "bajo" : (countryRisk ?? 0) < 1500 ? "medio" : "alto";
  const riskColor = riskLabel === "bajo" ? "#10b981" : riskLabel === "medio" ? "#f59e0b" : "#ef4444";

  const spread = rates.mep > 0 && rates.blue > 0
    ? +(((rates.blue - rates.mep) / rates.mep) * 100).toFixed(1)
    : null;

  const inflationBadge = source === "live"
    ? { label: "🟢 BCRA", color: "#10b981" }
    : { label: "⚪ referencial", color: "#94a3b8" };

  const riskBadge = countryRiskSource === "live"
    ? { label: "🟢 BCRA", color: "#10b981" }
    : { label: "⚪ ref", color: "#94a3b8" };

  return (
    <section className="panel macro-panel">
      <p className="eyebrow" style={{ marginBottom: 10 }}>Macro Argentina</p>
      <div className="macro-grid">
        <div className="macro-cell">
          <span>
            Inflación mensual
            <span className="fine-print" style={{ color: inflationBadge.color, marginLeft: 4 }}>
              {inflationBadge.label}
            </span>
          </span>
          <strong style={{ color: "#ef4444" }}>{inflationMonthly.toFixed(1)}%</strong>
        </div>
        <div className="macro-cell">
          <span>Inflación anual</span>
          <strong style={{ color: "#ef4444" }}>{inflationAnnual ?? "—"}%</strong>
        </div>
        {countryRisk != null && (
          <div className="macro-cell">
            <span>
              Riesgo país
              <span className="fine-print" style={{ color: riskBadge.color, marginLeft: 4 }}>
                {riskBadge.label}
              </span>
            </span>
            <strong style={{ color: riskColor }}>{countryRisk.toLocaleString("es-AR")} pts</strong>
          </div>
        )}
        <div className="macro-cell">
          <span>
            FCI MM ({fciMonthly}% TEM)
            <span className="fine-print" style={{ color: fciIsLive ? "#10b981" : "#94a3b8", marginLeft: 4 }}>
              {fciIsLive ? "🟢 BCRA" : "⚪ ref"}
            </span>
          </span>
          <strong style={{ color: positive ? "#10b981" : "#ef4444" }}>
            {positive ? "+" : ""}{realReturn}% real
          </strong>
        </div>
        {spread !== null && Math.abs(spread) > 1 && (
          <div className="macro-cell" style={{ gridColumn: "span 2" }}>
            <span>Spread MEP/blue</span>
            <strong style={{ color: spread < 3 ? "#10b981" : "#f59e0b" }}>
              {spread > 0 ? "+" : ""}{spread}%
              {spread < 3 ? " — dolarizar MEP = casi igual que blue" : " — blue más caro que MEP"}
            </strong>
          </div>
        )}
      </div>
      <p className="fine-print" style={{ marginTop: 8, color: "#64748b" }}>
        Inflación: INDEC vía BCRA API · Riesgo país: EMBI vía BCRA API · FCI MM: BADLAR×1.06/12{fciIsLive ? " (BCRA)" : " (ref)"}
      </p>
    </section>
  );
}

function TycoonBridgeBanner({
  state,
  setTab,
}: {
  state: AppState;
  setTab: (tab: Tab) => void;
}) {
  const uncollected = availableObjectives(state).filter(
    (obj) => obj.completedAt && !state.tycoon.completedObjectiveIds.includes(obj.id),
  );
  if (uncollected.length === 0) return null;
  const total = uncollected.reduce((s, o) => s + o.reward, 0);
  return (
    <button
      className="tycoon-bridge-banner"
      onClick={() => setTab("tycoon")}
      type="button"
    >
      <Zap size={16} style={{ color: "#f59e0b", flexShrink: 0 }} />
      <div>
        <strong>
          {uncollected.length} {uncollected.length === 1 ? "misión" : "misiones"} disponibles en Tycoon
        </strong>
        <span>{uncollected[0].title}{uncollected.length > 1 ? ` y ${uncollected.length - 1} más` : ""} · {total.toLocaleString("es-AR")} M</span>
      </div>
      <span style={{ marginLeft: "auto", color: "#f59e0b", fontSize: 18 }}>›</span>
    </button>
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
  const advices = advice(state);
  const [adviceIdx, setAdviceIdx] = useState(0);
  const currentAdvice = advices[Math.min(adviceIdx, advices.length - 1)];
  const expenses = monthlyExpenses(state);
  const budget = budgetHealth(state);
  const nextCard = [...state.cards].sort((a, b) => cardUrgency(a) - cardUrgency(b))[0];

  async function refresh() {
    const rates = await fetchRates(state.rates);
    setState((current) => ({ ...current, rates }));
  }

  const urgencyBorder: Record<string, string> = {
    high: "#ef4444",
    medium: "#f59e0b",
    low: "#10b981",
  };

  return (
    <>
      <MangoScoreCard state={state} setTab={setTab} />

      <ArenaWeekCard state={state} setTab={setTab} />

      <section
        className="panel advice"
        style={{ borderLeft: `3px solid ${urgencyBorder[currentAdvice.urgency]}` }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <p className="eyebrow">Asesor Mango</p>
          {advices.length > 1 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                className="ghost small"
                style={{ padding: "2px 6px", minHeight: 0 }}
                onClick={() => setAdviceIdx((i) => (i - 1 + advices.length) % advices.length)}
              >‹</button>
              <span className="fine-print">{adviceIdx + 1}/{advices.length}</span>
              <button
                className="ghost small"
                style={{ padding: "2px 6px", minHeight: 0 }}
                onClick={() => setAdviceIdx((i) => (i + 1) % advices.length)}
              >›</button>
            </div>
          )}
        </div>
        <h3>{currentAdvice.title}</h3>
        <p>{currentAdvice.body}</p>
        <button
          className="ghost small"
          style={{ marginTop: 8 }}
          onClick={() => setTab(currentAdvice.tab)}
        >
          Ir → {currentAdvice.tab === "profile" ? "Mi perfil" : currentAdvice.tab === "learn" ? "Aprender" : currentAdvice.tab === "expenses" ? "Gastos" : currentAdvice.tab === "goals" ? "Metas" : currentAdvice.tab === "simulador" ? "Simulador" : currentAdvice.tab === "mercados" ? "Mercados" : "Tycoon"}
        </button>
      </section>

      <button className="tycoon-entry" onClick={() => setTab("tycoon")}>
        <div>
          <p className="eyebrow">Juego interno</p>
          <h3>Mango Tycoon</h3>
          <div className="tycoon-entry-level">
            <span className="level-badge-sm">Nv {state.tycoon.level}</span>
            <span className="tycoon-entry-levelname">
              {LEVEL_NAMES[state.tycoon.level] ?? "Mango Master"}
            </span>
          </div>
          <span>
            {state.tycoon.mangoCash.toLocaleString("es-AR")} M
            {state.tycoon.eventHistory.length > 0
              ? ` · ${state.tycoon.eventHistory.length} meses`
              : " · ¡Empezá a jugar!"}
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

      <MacroPanel live={state.live} rates={state.rates} />

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

      <TycoonBridgeBanner state={state} setTab={setTab} />

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


function LearnTab({
  state,
  setState,
}: {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}) {
  const [learnView, setLearnView] = useState<"lecciones" | "cartera">("lecciones");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [cartAmount, setCartAmount] = useState(totalLiquid(state) || 300000);
  const [cartRisk, setCartRisk] = useState<RiskLevel>(state.user?.riskLevel ?? "moderado");
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

          {(LESSON_UNLOCK_COUNT[selected.id] ?? 0) > 0 && (
            <section className="panel lesson-tycoon-panel">
              <p className="eyebrow">🎮 Lo que desbloqueás en Tycoon</p>
              <div className="lesson-tycoon-events">
                {GAME_EVENTS.filter((ev) =>
                  ev.choices.some((ch) => ch.requiredLessonId === selected.id),
                ).map((ev) => (
                  <div key={ev.id} className="lesson-tycoon-event-row">
                    <span>{ev.emoji}</span>
                    <div>
                      <strong>{ev.title}</strong>
                      <span>
                        {ev.choices
                          .filter((ch) => ch.requiredLessonId === selected.id)
                          .map((ch) => ch.label)
                          .join(" · ")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </article>
      </>
    );
  }

  return (
    <>
      <PageIntro title="Aprender" text="Lecciones claras, ejemplos reales y mini quizzes con recompensa." />

      {/* Subtabs Lecciones / Mi Cartera */}
      <div className="segmented" style={{ margin: "0 0 12px" }}>
        {(["lecciones", "cartera"] as const).map((v) => (
          <button key={v} className={learnView === v ? "active" : ""} onClick={() => setLearnView(v)} type="button">
            {v === "lecciones" ? "Lecciones" : "Mi Cartera"}
          </button>
        ))}
      </div>

      {learnView === "lecciones" && (() => {
        const userRisk = state.user?.riskLevel ?? "moderado";
        const sorted = [...lessons].sort((a, b) => {
          const aDone = state.tycoon.completedLessonIds.includes(a.id);
          const bDone = state.tycoon.completedLessonIds.includes(b.id);
          if (aDone !== bDone) return aDone ? 1 : -1; // completadas al fondo
          const aRec = a.recommendedFor.includes(userRisk) ? 0 : 1;
          const bRec = b.recommendedFor.includes(userRisk) ? 0 : 1;
          return aRec - bRec;
        });
        const nextRecommended = sorted.find(
          (l) => !state.tycoon.completedLessonIds.includes(l.id) && l.recommendedFor.includes(userRisk),
        );
        return (
          <>
            <section className="panel learning-summary">
              <p className="eyebrow">Progreso</p>
              <h3>
                {state.tycoon.completedLessonIds.length}/{lessons.length} lecciones completadas
              </h3>
              {nextRecommended && (
                <p style={{ fontSize: 12, color: "#10b981", marginTop: 4 }}>
                  Siguiente para tu perfil: <strong>{nextRecommended.title}</strong>
                </p>
              )}
            </section>
            <div className="lesson-grid">
              {sorted.map((lesson) => {
                const unlockCount = LESSON_UNLOCK_COUNT[lesson.id] ?? 0;
                const done = state.tycoon.completedLessonIds.includes(lesson.id);
                const isRecommended = lesson.recommendedFor.includes(userRisk) && !done;
                return (
                  <button
                    className={`lesson-card${isRecommended ? " recommended" : ""}`}
                    key={lesson.id}
                    onClick={() => setSelectedId(lesson.id)}
                  >
                    <div>
                      <p className="eyebrow">Modulo · {lesson.level}</p>
                      <h3>{lesson.title}</h3>
                      <p>{lesson.subtitle}</p>
                      <div className="tag-row">
                        {isRecommended && (
                          <span style={{ background: "rgba(16,185,129,.15)", color: "#10b981", padding: "1px 6px", borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                            ⭐ Tu perfil
                          </span>
                        )}
                        {lesson.tags.map((tag) => (
                          <span key={tag}>{tag}</span>
                        ))}
                        {unlockCount > 0 && (
                          <span className={`lesson-tycoon-badge ${done ? "done" : ""}`}>
                            🎮 {unlockCount} en Tycoon
                          </span>
                        )}
                      </div>
                    </div>
                    <strong>
                      {done ? "✓" : `+${lessonReward} M`}
                    </strong>
                  </button>
                );
              })}
            </div>
          </>
        );
      })()}

      {learnView === "cartera" && (
        <>
          <section className="panel">
            <p className="eyebrow" style={{ marginBottom: 8 }}>Cartera sugerida para tu perfil</p>
            {totalDebt(state) > 100000 && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", marginBottom: 12 }}>
                <p style={{ fontSize: 12, color: "#dc2626", margin: 0 }}>
                  Tenés {money(totalDebt(state))} en tarjetas. Pagar deuda suele ganarle a cualquier inversión.
                </p>
              </div>
            )}
            <div className="segmented" style={{ marginBottom: 12 }}>
              {(["conservador", "moderado", "agresivo"] as const).map((r) => (
                <button key={r} className={cartRisk === r ? "active" : ""} type="button" onClick={() => setCartRisk(r)}>
                  {r}
                </button>
              ))}
            </div>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: "#64748b" }}>Monto a distribuir</span>
              <input value={cartAmount} onChange={(e) => setCartAmount(Number(e.target.value) || 0)} inputMode="numeric" />
            </label>
            <div className="portfolio-list">
              {riskPortfolios[cartRisk].map((item) => (
                <div className="portfolio-row" key={item.name}>
                  <div>
                    <strong>{item.name}</strong>
                    <span>{item.detail}</span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <strong>{money((cartAmount * item.pct) / 100)}</strong>
                    <span>{item.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="panel muted">
            <ShieldCheck size={18} style={{ color: "#10b981" }} />
            <p style={{ fontSize: 13 }}>
              Esto es educación financiera, no asesoramiento registrado. Ajustá los porcentajes a tu situación real.
            </p>
          </section>
        </>
      )}
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
  const hasChain = !!resolution.chainEventId;

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

      <button className={`primary ${hasChain ? "chain-continue-btn" : ""}`} onClick={onContinue}>
        {hasChain ? "⚡ Las consecuencias siguen →" : "Continuar →"}
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

  function handleContinue() {
    const chain = resolution?.chainEventId;
    setResolution(null);
    if (chain) {
      setState((current) => ({
        ...current,
        tycoon: { ...current.tycoon, currentEventId: chain },
      }));
    }
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
        <ConsequenceCard resolution={resolution} onContinue={handleContinue} />
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
        {byCategory.length > 0 && (
          <SpendingDonut byCategory={byCategory} total={total} />
        )}
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
  const monthlySavings = Math.max(0, (state.user?.salary ?? 0) - monthlyExpenses(state));

  return (
    <>
      <PageIntro title="Metas" text="Cada peso que separes hoy es un objetivo cumplido manana." />

      {state.goals.length > 0 && (
        <section className="panel goal-summary">
          <p className="eyebrow">Progreso general</p>
          <h3>
            {done}/{state.goals.length} metas cumplidas
          </h3>
          {monthlySavings > 0 && (
            <p className="fine-print" style={{ color: "#64748b", marginTop: 4 }}>
              Ahorro estimado este mes: {money(monthlySavings)} (sueldo − gastos)
            </p>
          )}
        </section>
      )}

      <div className="goal-list">
        {state.goals.map((goal) => {
          const { pct, remaining, done } = goalProgress(goal);
          const isDepositing = depositGoalId === goal.id;
          const daysLeft = goal.deadline ? daysUntilDeadline(goal.deadline) : null;
          const proj = goalProjection(goal, monthlySavings);
          const salary = state.user?.salary ?? 0;

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

              {/* Proyección educativa */}
              {!done && (
                <div className="goal-projection">
                  {proj.monthsToGoal != null && monthlySavings > 0 && (
                    <span>
                      A este ritmo: <strong>{proj.monthsToGoal} {proj.monthsToGoal === 1 ? "mes" : "meses"}</strong>
                    </span>
                  )}
                  {proj.requiredMonthly != null && (
                    <span style={{ color: proj.onTrack ? "#10b981" : "#ef4444" }}>
                      {proj.onTrack ? "En tiempo" : `Necesitás ${money(proj.requiredMonthly)}/mes`}
                    </span>
                  )}
                </div>
              )}

              {/* Depósitos rápidos */}
              {!done && !isDepositing && salary > 0 && (
                <div className="goal-quick-deposits">
                  {[0.05, 0.1, 0.2].map((pctS) => {
                    const amt = Math.round((salary * pctS) / 100) * 100;
                    if (amt <= 0 || amt > remaining) return null;
                    return (
                      <button
                        key={pctS}
                        className="ghost small"
                        type="button"
                        onClick={() => setState((cur) => addToGoal(cur, goal.id, amt))}
                      >
                        +{money(amt)}
                      </button>
                    );
                  })}
                </div>
              )}

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
  authUserId,
  isPro,
  onSignOut,
  onUpgrade,
}: {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  authUserId: string | null;
  isPro: boolean;
  onSignOut: () => void;
  onUpgrade: () => void;
}) {
  const [legalModal, setLegalModal] = useState<"tos" | "privacy" | null>(null);

  function exportCSV() {
    const rows = [
      ["Fecha", "Categoría", "Monto", "Descripción"],
      ...state.expenses.map((e) => [e.date, e.category, String(e.amount), e.description]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    a.download = "mango-gastos.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }
  const history = state.netWorthHistory ?? [];
  const growth = history.length >= 2 ? netWorthGrowth(history) : null;
  const currentNW = netWorth(state);

  return (
    <>
      <PageIntro title="Yo" text="Cuentas, tarjetas y configuracion." />

      {/* Patrimonio neto y evolución */}
      <section className="panel">
        <p className="eyebrow">Patrimonio neto</p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
          <span style={{ fontSize: 26, fontWeight: 800 }}>{money(currentNW, state.user?.hidden)}</span>
          {growth && (
            <span style={{ fontSize: 13, fontWeight: 700, color: growth.trend === "up" ? "#10b981" : growth.trend === "down" ? "#ef4444" : "var(--muted)" }}>
              {growth.trend === "up" ? "▲" : growth.trend === "down" ? "▼" : "→"} {Math.abs(growth.pct).toFixed(1)}% desde inicio
            </span>
          )}
        </div>
        {history.length >= 2 ? (
          <NetWorthChart history={history} />
        ) : (
          <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>
            La evolución de tu patrimonio aparecerá aquí con el tiempo. Cargá tus cuentas y avanzá en Mango Tycoon.
          </p>
        )}
      </section>

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
      {/* Pro status */}
      <section className="panel">
        <p className="eyebrow" style={{ marginBottom: 10 }}>Mango Pro</p>
        {isPro ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ fontSize: 13, color: "#10b981", fontWeight: 700, margin: 0 }}>⭐ Suscripción activa</p>
            <p className="fine-print" style={{ margin: 0 }}>Sync en la nube, historial ilimitado y exportar CSV habilitados.</p>
            <button className="ghost small" style={{ justifyContent: "flex-start" }} onClick={exportCSV}>
              📥 Exportar gastos a CSV
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p className="fine-print" style={{ margin: 0 }}>
              Sincronizá tus datos desde cualquier dispositivo, exportá a CSV y desbloqueá historial ilimitado.
            </p>
            <button className="primary small" onClick={onUpgrade}>
              ⭐ Ver planes Pro
            </button>
            {state.expenses.length > 0 && (
              <p className="fine-print" style={{ margin: 0, color: "var(--muted)" }}>
                Exportar CSV requiere plan Pro.
              </p>
            )}
          </div>
        )}
      </section>

      <section className="panel">
        <p className="eyebrow" style={{ marginBottom: 10 }}>Legal</p>
        <p className="fine-print" style={{ marginBottom: 12, lineHeight: 1.5 }}>
          Mango es una herramienta educativa. Los precios y tasas son de APIs públicas y pueden
          tener demoras. Nada aquí constituye asesoramiento financiero.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button className="ghost small" style={{ justifyContent: "flex-start" }} onClick={() => setLegalModal("tos")}>
            📄 Términos de Servicio
          </button>
          <button className="ghost small" style={{ justifyContent: "flex-start" }} onClick={() => setLegalModal("privacy")}>
            🔒 Política de Privacidad
          </button>
        </div>
        {state.user?.acceptedTermsAt && (
          <p className="fine-print" style={{ marginTop: 10, color: "var(--muted)" }}>
            Aceptado el {new Date(state.user.acceptedTermsAt).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        )}
      </section>

      <section className="panel danger">
        <p className="eyebrow">Zona sensible</p>
        {authUserId && (
          <div style={{ marginBottom: 10 }}>
            <p className="fine-print" style={{ marginBottom: 6 }}>
              <span style={{ color: "#10b981" }}>● Sincronizado con la nube</span>
              {" · "}cuenta activa
            </p>
            <button
              className="ghost small"
              style={{ width: "100%", marginBottom: 8 }}
              onClick={() => { if (confirm("¿Cerrar sesión? Tus datos quedan guardados.")) onSignOut(); }}
            >
              Cerrar sesión
            </button>
          </div>
        )}
        <button
          className="danger-button"
          onClick={() => {
            if (!confirm("Borrar todos los datos de Mango? Esta acción no se puede deshacer.")) return;
            onSignOut();
          }}
        >
          {authUserId ? "Borrar cuenta y datos" : "Borrar datos locales"}
        </button>
      </section>

      {legalModal && <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />}
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

// ─── GroupTab ─────────────────────────────────────────────────────────────────

const APP_BASE = typeof window !== "undefined" ? window.location.origin : "https://usemango.app";

function GroupTab({
  authUserId,
  displayName,
  pendingToken,
  onTokenConsumed,
  rates,
}: {
  authUserId: string | null;
  displayName: string;
  pendingToken: string | null;
  onTokenConsumed: () => void;
  rates: AppState["rates"];
}) {
  const [group,    setGroup]    = useState<SharedGroup | null | "loading">("loading");
  const [members,  setMembers]  = useState<GroupMember[]>([]);
  const [expenses, setExpenses] = useState<GroupExpense[]>([]);
  const [screen,   setScreen]   = useState<"main" | "create" | "join">("main");
  const [copied,   setCopied]   = useState(false);

  // form state
  const [groupName,    setGroupName]    = useState("");
  const [joinName,     setJoinName]     = useState(displayName);
  const [newAmount,    setNewAmount]    = useState("");
  const [newDesc,      setNewDesc]      = useState("");
  const [newCategory,  setNewCategory]  = useState<ExpenseCategory>("otros");
  const [newDate,      setNewDate]      = useState(new Date().toISOString().slice(0, 10));
  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  // Load group on mount
  useEffect(() => {
    if (!authUserId) { setGroup(null); return; }
    getMyGroup(authUserId).then((g) => {
      setGroup(g);
      if (g) loadGroupData(g.id);
    });
  }, [authUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  // If we arrived with a pending join token, open the join screen
  useEffect(() => {
    if (pendingToken && group !== "loading") setScreen("join");
  }, [pendingToken, group]);

  async function loadGroupData(groupId: string) {
    const [m, e] = await Promise.all([getGroupMembers(groupId), getGroupExpenses(groupId)]);
    setMembers(m);
    setExpenses(e);
  }

  async function handleCreate(ev: FormEvent) {
    ev.preventDefault();
    if (!groupName.trim()) return;
    setSubmitting(true); setError(null);
    const g = await createGroup(groupName, displayName);
    if (!g) { setError("No se pudo crear el grupo."); setSubmitting(false); return; }
    setGroup(g);
    await loadGroupData(g.id);
    setScreen("main");
    setGroupName("");
    setSubmitting(false);
  }

  async function handleJoin(ev: FormEvent) {
    ev.preventDefault();
    const token = pendingToken ?? "";
    if (!token || !joinName.trim()) return;
    setSubmitting(true); setError(null);
    const g = await joinGroupByToken(token, joinName);
    if (!g) { setError("Invitación inválida o expirada."); setSubmitting(false); return; }
    onTokenConsumed();
    setGroup(g);
    await loadGroupData(g.id);
    setScreen("main");
    setSubmitting(false);
  }

  async function handleAddExpense(ev: FormEvent) {
    ev.preventDefault();
    if (!group || group === "loading" || !newAmount) return;
    setSubmitting(true);
    const expense = await addGroupExpense(group.id, {
      category: newCategory,
      amount: Number(newAmount),
      description: newDesc.trim() || newCategory,
      date: newDate,
    });
    if (expense) {
      setExpenses((prev) => [expense, ...prev]);
      setNewAmount(""); setNewDesc("");
    }
    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    await deleteGroupExpense(id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  async function handleLeave() {
    if (!group || group === "loading" || !authUserId) return;
    if (!confirm("¿Salir del grupo? Ya no verás los gastos compartidos.")) return;
    await leaveGroup(group.id, authUserId);
    setGroup(null); setMembers([]); setExpenses([]);
  }

  function copyInviteLink() {
    if (!group || group === "loading") return;
    const url = `${APP_BASE}?join=${group.invite_token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // ── No autenticado ──
  if (!authUserId) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <PageIntro title="Gastos grupales" text="Necesitás una cuenta para usar grupos." />
        <p className="fine-print" style={{ marginTop: 8 }}>Creá tu cuenta en Perfil → Cuenta.</p>
      </div>
    );
  }

  // ── Cargando ──
  if (group === "loading") {
    return <div style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>Cargando…</div>;
  }

  // ── Crear grupo ──
  if (screen === "create") {
    return (
      <div style={{ padding: 20 }}>
        <PageIntro title="Nuevo grupo" text="Creá un espacio compartido de gastos." />
        <form className="panel form-grid" onSubmit={handleCreate}>
          <label>
            Nombre del grupo
            <input
              placeholder="ej. Casa 2025, Viaje Bariloche..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              required
            />
          </label>
          {error && <p style={{ color: "#ef4444", fontSize: 13 }}>{error}</p>}
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="ghost" onClick={() => setScreen("main")}>Cancelar</button>
            <button type="submit" className="primary" disabled={submitting} style={{ flex: 1 }}>
              {submitting ? "Creando…" : "Crear grupo"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ── Unirse a grupo ──
  if (screen === "join") {
    return (
      <div style={{ padding: 20 }}>
        <PageIntro title="Unirse al grupo" text="Alguien te invitó a un espacio compartido." />
        <form className="panel form-grid" onSubmit={handleJoin}>
          <label>
            Tu nombre en el grupo
            <input
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              placeholder="Como querés que te vean"
              required
            />
          </label>
          {error && <p style={{ color: "#ef4444", fontSize: 13 }}>{error}</p>}
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="ghost" onClick={() => { onTokenConsumed(); setScreen("main"); }}>Cancelar</button>
            <button type="submit" className="primary" disabled={submitting} style={{ flex: 1 }}>
              {submitting ? "Uniéndose…" : "Unirme al grupo"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ── Sin grupo ──
  if (!group) {
    return (
      <div style={{ padding: 24 }}>
        <PageIntro title="Grupos" text="Gastos compartidos para parejas, roomies o viajes." />
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
          <button className="primary" onClick={() => setScreen("create")}>
            + Crear un grupo
          </button>
          {pendingToken && (
            <button className="ghost" onClick={() => setScreen("join")}>
              Tengo una invitación
            </button>
          )}
        </div>
        <div style={{ marginTop: 24, padding: 16, background: "var(--surface-alt, var(--surface))", borderRadius: 14 }}>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: 0, lineHeight: 1.6 }}>
            💡 Creá un grupo → compartí el QR o el link → todos agregan sus gastos → Mango muestra quién puso qué y cómo quedar a mano.
          </p>
        </div>
      </div>
    );
  }

  // ── Grupo activo ──
  const balance = computeBalance(members, expenses);
  const myBalance = balance.find((b) => b.userId === authUserId);
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const inviteUrl = `${APP_BASE}?join=${group.invite_token}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(inviteUrl)}`;

  return (
    <>
      <PageIntro title={group.name} text={`${members.length} miembro${members.length !== 1 ? "s" : ""} · ${expenses.length} gastos`} />

      {/* Balance personal */}
      {myBalance && (
        <section className="panel" style={{ textAlign: "center" }}>
          <p className="eyebrow">Tu balance</p>
          <span style={{
            fontSize: 28, fontWeight: 800,
            color: myBalance.balance >= 0 ? "#10b981" : "#ef4444",
          }}>
            {myBalance.balance >= 0 ? "+" : ""}{money(myBalance.balance)}
          </span>
          <p className="fine-print" style={{ marginTop: 4 }}>
            {myBalance.balance > 50 ? "El grupo te debe" : myBalance.balance < -50 ? "Debés al grupo" : "Estás a mano ✓"}
            {" · "}Pusiste {money(myBalance.paid)} de {money(myBalance.fairShare)} que te tocan
          </p>
        </section>
      )}

      {/* Balance de todos */}
      <section className="panel">
        <p className="eyebrow">Quién puso qué</p>
        <div className="list embedded">
          {balance.map((b) => (
            <div className="list-row" key={b.userId}>
              <div>
                <strong>{b.displayName}{b.userId === authUserId ? " (vos)" : ""}</strong>
                <span>{money(b.paid)} pagados</span>
              </div>
              <span style={{
                fontWeight: 700, fontSize: 14,
                color: b.balance >= 0 ? "#10b981" : "#ef4444",
              }}>
                {b.balance >= 0 ? "+" : ""}{money(b.balance)}
              </span>
            </div>
          ))}
        </div>
        <p className="fine-print" style={{ marginTop: 10 }}>Total del grupo: {money(total)}</p>
      </section>

      {/* Agregar gasto */}
      <form className="panel form-grid" onSubmit={handleAddExpense}>
        <p className="eyebrow">Agregar gasto al grupo</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label>
            Monto $
            <input type="number" min="1" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} placeholder="0" required />
          </label>
          <label>
            Categoría
            <select value={newCategory} onChange={(e) => setNewCategory(e.target.value as ExpenseCategory)}>
              {categoryOptions.map(([id, { label }]) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Descripción (opcional)
          <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="ej. Supermercado semanal" />
        </label>
        <label>
          Fecha
          <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
        </label>
        <button type="submit" className="primary" disabled={submitting || !newAmount}>
          {submitting ? "Guardando…" : "Agregar gasto"}
        </button>
      </form>

      {/* Lista de gastos */}
      {expenses.length > 0 && (
        <section className="panel">
          <p className="eyebrow">Gastos compartidos</p>
          <div className="list embedded">
            {expenses.map((e) => {
              const memberName = members.find((m) => m.user_id === e.added_by)?.display_name ?? "Alguien";
              const isOwn = e.added_by === authUserId;
              return (
                <div className="list-row" key={e.id}>
                  <div>
                    <strong>{e.description}</strong>
                    <span>{memberName} · {new Date(e.date).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}</span>
                  </div>
                  <div className="row-actions">
                    <strong>{money(e.amount)}</strong>
                    {isOwn && (
                      <button className="icon-button light" onClick={() => handleDelete(e.id)}>
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Invitar al grupo */}
      <section className="panel">
        <p className="eyebrow">Invitar al grupo</p>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
          <img src={qrUrl} alt="QR de invitación" width={160} height={160} style={{ borderRadius: 12, border: "4px solid var(--surface)" }} />
        </div>
        <button className="ghost" onClick={copyInviteLink} style={{ width: "100%", gap: 8 }}>
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? "¡Link copiado!" : "Copiar link de invitación"}
        </button>
        <p className="fine-print" style={{ marginTop: 8, wordBreak: "break-all", opacity: 0.6 }}>{inviteUrl}</p>
      </section>

      {/* Salir del grupo */}
      <section className="panel danger">
        <p className="eyebrow">Zona sensible</p>
        <button className="danger-button" onClick={handleLeave}>Salir del grupo</button>
        <p className="fine-print" style={{ marginTop: 8 }}>Los gastos que cargaste seguirán visibles para el resto.</p>
      </section>
    </>
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
    { id: "grupo"     as const, label: "Grupo",     icon: Users },
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
          <strong style={{ fontSize: 15, fontWeight: 800 }}>Semana #{weekNum} · Benchmark simulado</strong>
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
        <p style={{ fontSize: 11, color: "var(--muted)", margin: "2px 0 4px" }}>
          Top {topPct}% del benchmark
          {topPct <= 20 ? " 🔥 Excelente semana" : topPct <= 50 ? " — Seguís sumando" : " — Simulá más para subir 💪"}
        </p>
        <p style={{ fontSize: 10, color: "#64748b", margin: "0 0 8px", fontStyle: "italic" }}>
          Benchmark educativo simulado · Datos históricos · Sin competencia real
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
  const [view, setView] = useState<"mercado" | "cartera" | "historial" | "carteras">("mercado");
  const [catFilter, setCatFilter] = useState<SimAssetCategory | "todos">("todos");
  const [buyAssetId, setBuyAssetId] = useState<string | null>(null);
  const [buyAmount, setBuyAmount] = useState("100");
  const [sellAssetId, setSellAssetId] = useState<string | null>(null);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [priceError, setPriceError] = useState(false);
  const [simRisk, setSimRisk] = useState<RiskLevel>(state.user?.riskLevel ?? "moderado");
  const [simAmount, setSimAmount] = useState(300000);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshPrices = useCallback(async () => {
    setLoadingPrices(true);
    setPriceError(false);
    try {
      const { prices, lecapTEM } = await fetchSimPrices(sim.prices);
      setState((cur) => {
        const updated = updateSimPrices(cur, prices);
        if (lecapTEM !== undefined) {
          return {
            ...updated,
            live: { ...updated.live, lecapTEM, lecapSource: "live" as const },
          };
        }
        return updated;
      });
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
        {(["mercado", "cartera", "historial", "carteras"] as const).map((v) => (
          <button key={v} className={view === v ? "active" : ""} onClick={() => setView(v)} type="button">
            {v === "mercado" ? "Mercado" : v === "cartera" ? "Mi cartera" : v === "historial" ? "Historial" : "Carteras"}
          </button>
        ))}
      </div>

      {/* ── Vista: Mercado ── */}
      {view === "mercado" && (
        <>
          {/* Filtro de categoría */}
          <div className="cat-filter-row">
            {(["todos", "crypto", "memecoin", "stock", "cedear", "bono"] as const).map((cat) => (
              <button
                key={cat}
                className={`cat-chip ${catFilter === cat ? "active" : ""}`}
                onClick={() => setCatFilter(cat)}
                type="button"
                style={cat !== "todos" ? {
                  borderColor: CATEGORY_COLOR[cat as SimAssetCategory],
                  color: catFilter === cat ? "#fff" : CATEGORY_COLOR[cat as SimAssetCategory],
                  background: catFilter === cat ? CATEGORY_COLOR[cat as SimAssetCategory] : `${CATEGORY_COLOR[cat as SimAssetCategory]}12`,
                } : {}}
              >
                {cat === "todos" ? "Todos" : CATEGORY_LABEL[cat as SimAssetCategory]}
              </button>
            ))}
          </div>
          <div className="asset-list">
            {SIM_ASSETS.filter((a) => catFilter === "todos" || a.category === catFilter).map((asset) => {
              const price   = sim.prices[asset.id] ?? asset.defaultPrice;
              const pos     = sim.positions.find((p) => p.assetId === asset.id);
              const history = sim.priceHistory?.[asset.id] ?? [];
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
                      {asset.category === "bono" && (
                        <div style={{ fontSize: 10, color: "#94a3b8" }}>precio ref.</div>
                      )}
                      {pos && (
                        <div style={{ fontSize: 12, color: "#64748b" }}>
                          Tenés {formatSimQty(pos.quantity, asset.id)}
                        </div>
                      )}
                    </div>
                  </div>
                  {history.length >= 2 && (
                    <div style={{ marginBottom: 4 }}>
                      <Sparkline data={history} width={90} height={26} />
                    </div>
                  )}
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
        </>
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

      {/* ── Vista: Carteras ── */}
      {view === "carteras" && (
        <section className="panel">
          <p className="eyebrow" style={{ marginBottom: 8 }}>Cartera sugerida por perfil</p>
          <div className="segmented" style={{ marginBottom: 12 }}>
            {(["conservador", "moderado", "agresivo"] as const).map((r) => (
              <button
                key={r}
                className={simRisk === r ? "active" : ""}
                type="button"
                onClick={() => setSimRisk(r)}
              >
                {r}
              </button>
            ))}
          </div>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: "#64748b" }}>Monto a distribuir</span>
            <input
              value={simAmount}
              onChange={(e) => setSimAmount(Number(e.target.value) || 0)}
              inputMode="numeric"
            />
          </label>
          <div className="portfolio-list">
            {riskPortfolios[simRisk].map((item) => (
              <div className="portfolio-row" key={item.name}>
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.detail}</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <strong>{money((simAmount * item.pct) / 100)}</strong>
                  <span>{item.pct}%</span>
                </div>
              </div>
            ))}
          </div>
          <p className="fine-print" style={{ marginTop: 10, color: "#64748b" }}>
            Esto es educación financiera, no asesoramiento. Ajustá los porcentajes a tu situación.
          </p>
        </section>
      )}

      <p className="fine-print" style={{ textAlign: "center", color: "var(--muted)", padding: "0 16px 8px" }}>
        Simulador con dinero ficticio · Precios de APIs públicas con posibles demoras · No constituye asesoramiento financiero
      </p>

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

// ─── Mercados ─────────────────────────────────────────────────────────────────

function RatesHistoryChart({ history }: { history: Array<{ date: string; mep: number; blue: number; oficial: number }> }) {
  if (history.length < 2) return null;
  const W = 300; const H = 70; const pad = 10;
  const w = W - pad * 2; const h = H - pad * 2;

  function toPoints(vals: number[]) {
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;
    return vals.map((v, i) => {
      const x = pad + (i / (vals.length - 1)) * w;
      const y = pad + h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
  }

  const mepVals = history.map((d) => d.mep);
  const blueVals = history.map((d) => d.blue);
  const allVals = [...mepVals, ...blueVals];
  const min = Math.min(...allVals);
  const max = Math.max(...allVals);
  const range = max - min || 1;

  function toSharedPoints(vals: number[]) {
    return vals.map((v, i) => {
      const x = pad + (i / (vals.length - 1)) * w;
      const y = pad + h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
  }

  const firstDate = history[0].date.slice(5);  // MM-DD
  const lastDate = history[history.length - 1].date.slice(5);
  const lastMep = mepVals[mepVals.length - 1];
  const lastBlue = blueVals[blueVals.length - 1];
  const spread = lastMep > 0 ? (((lastBlue - lastMep) / lastMep) * 100).toFixed(1) : "—";

  return (
    <div className="net-worth-chart" style={{ marginTop: 10 }}>
      <div style={{ display: "flex", gap: 12, fontSize: 11, marginBottom: 6 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ display: "inline-block", width: 16, height: 2, background: "#1D9BF0", borderRadius: 1 }} />
          MEP
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ display: "inline-block", width: 16, height: 2, background: "#10b981", borderRadius: 1 }} />
          Blue
        </span>
        <span style={{ marginLeft: "auto", color: "var(--muted)" }}>brecha: {spread}%</span>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ display: "block" }}>
        <polyline points={toSharedPoints(mepVals)} fill="none" stroke="#1D9BF0" strokeWidth="1.5" strokeLinejoin="round" />
        <polyline points={toSharedPoints(blueVals)} fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinejoin="round" strokeDasharray="4 2" />
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
        <span>{firstDate}</span>
        <span>{lastDate}</span>
      </div>
    </div>
  );
}

// Fallback educativo: se usa solo si el Worker no devuelve precio de LECAP activa en BYMA
const LECAP_TEM_FALLBACK = 3.5;

function MercadosTab({
  state,
  setTab,
}: {
  state: AppState;
  setTab: (tab: Tab) => void;
}) {
  const [riskView, setRiskView] = useState<RiskLevel>(state.user?.riskLevel ?? "moderado");
  const [amount, setAmount] = useState(300000);
  const rates = state.rates;
  const portfolio = riskPortfolios[riskView];
  const debt = totalDebt(state);

  const dollarRows = [
    { label: "Oficial", value: rates.oficial },
    { label: "MEP (bolsa)", value: rates.mep },
    { label: "CCL", value: rates.ccl },
    { label: "Blue", value: rates.blue },
    { label: "Cripto", value: rates.cripto },
  ];

  const cryptoIds = ["BTC", "ETH", "ADA", "DOGE", "SHIB"];

  return (
    <>
      <div className="page-intro">
        <h2>Mercados</h2>
        <p>Cotizaciones en vivo y carteras educativas para Argentina.</p>
      </div>

      {/* ── Cotizaciones dólar ── */}
      <section className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <p className="eyebrow" style={{ margin: 0 }}>Dólar hoy</p>
          <span className="fine-print" style={{ color: rates.source === "live" ? "#10b981" : "#94a3b8" }}>
            {rates.source === "live" ? "🟢 en vivo" : "⚪ demo"}
          </span>
        </div>
        <div className="dollar-grid">
          {dollarRows.map((row) => (
            <div key={row.label} className="dollar-row">
              <span>{row.label}</span>
              <strong>${row.value.toLocaleString("es-AR")}</strong>
            </div>
          ))}
        </div>
        {(rates.history?.length ?? 0) >= 2 && (
          <>
            <p className="eyebrow" style={{ marginTop: 14, marginBottom: 0 }}>Histórico MEP vs Blue (últimos {rates.history!.length} días)</p>
            <RatesHistoryChart history={rates.history!} />
          </>
        )}
      </section>

      <MacroPanel live={state.live} rates={state.rates} />

      {/* ── Tasas de referencia Argentina ── */}
      {(() => {
        const live = state.live;
        const src  = live.ratesSource === "live";
        const badge = (isLive: boolean) => (
          <span className="fine-print" style={{ color: isLive ? "#10b981" : "#94a3b8", marginLeft: 4 }}>
            {isLive ? "🟢 BCRA" : "⚪ ref"}
          </span>
        );

        // Derivaciones desde BADLAR y pases (rangos reales de mercado AR)
        // FCI MM rinde ~BADLAR + 6%  (mayor rotación que plazo fijo bancario)
        // Plazo fijo minorista ≈ BADLAR × 0.83 (retail recibe menos que wholesale)
        // Caución 1d ≈ pases × 0.95  (se ancla a la tasa de política monetaria)
        const badlar = live.badlarTNA ?? 38;
        const pases  = live.pasesTNA  ?? 32;
        const fciTNA  = +(badlar * 1.06).toFixed(1);
        const pfTNA   = +(badlar * 0.83).toFixed(1);
        const cauTNA  = +(pases  * 0.95).toFixed(1);

        const rows = [
          {
            name:   "FCI Mercado de Dinero",
            detail: "Liquidez inmediata, rescate en 24hs",
            rate:   `${fciTNA}% TNA`,
            isLive: src,
            note:   "Derivado de BADLAR",
          },
          {
            name:   "Plazo Fijo 30 días",
            detail: "Banco privado, garantía SEDESA hasta $6M",
            rate:   `${pfTNA}% TNA`,
            isLive: src,
            note:   "Derivado de BADLAR",
          },
          {
            name:   "LECAP (corto plazo)",
            detail: "Letras del Tesoro en pesos, vence en meses",
            rate:   `${live.lecapTEM ?? LECAP_TEM_FALLBACK}% TEM`,
            isLive: live.lecapSource === "live",
            note:   live.lecapSource === "live" ? "Precio BYMA en vivo" : "Referencial",
          },
          {
            name:   "Caución bursátil 1d",
            detail: "Garantizada por BYMA, muy líquida",
            rate:   `${cauTNA}% TNA`,
            isLive: src,
            note:   "Derivado de pases BCRA",
          },
        ];

        return (
          <section className="panel">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <p className="eyebrow" style={{ margin: 0 }}>Tasas de referencia (ARS)</p>
              {src && <span className="fine-print" style={{ color: "#10b981" }}>🟢 BCRA en vivo</span>}
            </div>
            {rows.map((r) => (
              <div key={r.name} className="ref-rate-row">
                <div>
                  <strong style={{ fontSize: 13 }}>
                    {r.name}
                    {badge(r.isLive)}
                  </strong>
                  <span style={{ display: "block", fontSize: 11, color: "#94a3b8", marginTop: 1 }}>
                    {r.detail} · {r.note}
                  </span>
                </div>
                <span className="rate-badge">{r.rate}</span>
              </div>
            ))}
            <p className="fine-print" style={{ marginTop: 8, color: "#64748b" }}>
              FCI/PF/Caución: BADLAR y pases vía BCRA API. LECAP: precio de mercado BYMA vía Yahoo Finance.
            </p>
          </section>
        );
      })()}

      {/* ── Cripto en vivo ── */}
      <section className="panel">
        <p className="eyebrow" style={{ marginBottom: 8 }}>Cripto (USD en vivo)</p>
        {cryptoIds.map((id) => {
          const asset = SIM_ASSETS.find((a) => a.id === id);
          const price = state.simulator.prices[id] ?? asset?.defaultPrice ?? 0;
          return (
            <div key={id} className="ref-rate-row">
              <div>
                <strong style={{ fontSize: 13 }}>{asset?.symbol}</strong>
                <span style={{ display: "block", fontSize: 11, color: "#94a3b8" }}>{asset?.name}</span>
              </div>
              <strong style={{ fontVariantNumeric: "tabular-nums" }}>{formatSimPrice(price)}</strong>
            </div>
          );
        })}
        <button className="ghost small" style={{ marginTop: 10 }} onClick={() => setTab("simulador")}>
          Practicar en el simulador →
        </button>
      </section>

      {/* ── Portfolio educativo ── */}
      <section className="panel">
        <p className="eyebrow" style={{ marginBottom: 8 }}>Cartera sugerida por perfil</p>
        {debt > 100000 && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", marginBottom: 12 }}>
            <p style={{ fontSize: 12, color: "#dc2626", margin: 0 }}>
              Tenés {money(debt)} en tarjetas. Pagar deuda suele ganarle a cualquier inversión.
            </p>
          </div>
        )}
        <div className="segmented" style={{ marginBottom: 12 }}>
          {(["conservador", "moderado", "agresivo"] as const).map((r) => (
            <button
              key={r}
              className={riskView === r ? "active" : ""}
              type="button"
              onClick={() => setRiskView(r)}
            >
              {r}
            </button>
          ))}
        </div>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: "#64748b" }}>Monto a distribuir</span>
          <input
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value) || 0)}
            inputMode="numeric"
          />
        </label>
        <div className="portfolio-list">
          {portfolio.map((item) => (
            <div className="portfolio-row" key={item.name}>
              <div>
                <strong>{item.name}</strong>
                <span>{item.detail}</span>
              </div>
              <div style={{ textAlign: "right" }}>
                <strong>{money((amount * item.pct) / 100)}</strong>
                <span>{item.pct}%</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel muted" style={{ marginTop: 8 }}>
        <ShieldCheck size={18} style={{ color: "#10b981" }} />
        <p style={{ fontSize: 13 }}>
          Esto es educación financiera, no asesoramiento registrado. Nada es recomendación de compra.
        </p>
      </section>
    </>
  );
}

function NetWorthChart({ history }: { history: Array<{ date: string; value: number }> }) {
  if (history.length < 2) return null;
  const values = history.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const W = 300; const H = 80; const pad = 10;
  const w = W - pad * 2; const h = H - pad * 2;
  const pts = history.map((d, i) => {
    const x = pad + (i / (history.length - 1)) * w;
    const y = pad + h - ((d.value - min) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const zeroY = min >= 0 ? H : max <= 0 ? pad : pad + h - ((0 - min) / range) * h;
  const last = values[values.length - 1];
  const first = values[0];
  const rising = last >= first;
  const color = rising ? "#10b981" : "#ef4444";
  const pct = first !== 0 ? ((last - first) / Math.abs(first)) * 100 : 0;
  const firstDate = history[0].date.slice(0, 7);
  const lastDate = history[history.length - 1].date.slice(0, 7);

  return (
    <div className="net-worth-chart">
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ display: "block" }}>
        <line x1={pad} y1={zeroY} x2={W - pad} y2={zeroY} stroke="var(--border)" strokeWidth="1" strokeDasharray="3 3" />
        <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {history.map((d, i) => {
          const x = pad + (i / (history.length - 1)) * w;
          const y = pad + h - ((d.value - min) / range) * h;
          return <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r="3" fill={color} />;
        })}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
        <span>{firstDate}</span>
        <span style={{ color, fontWeight: 700 }}>{pct >= 0 ? "+" : ""}{pct.toFixed(1)}% total</span>
        <span>{lastDate}</span>
      </div>
    </div>
  );
}

function Sparkline({
  data,
  width = 80,
  height = 28,
}: {
  data: Array<{ t: number; p: number }>;
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;
  const prices = data.map((d) => d.p);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const pad = 2;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const pts = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * w;
    const y = pad + h - ((d.p - min) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const rising = prices[prices.length - 1] >= prices[0];
  const color = rising ? "#10b981" : "#ef4444";
  const pct = ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <svg width={width} height={height} style={{ flex: `0 0 ${width}px` }}>
        <polyline
          points={pts.join(" ")}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      <span style={{ fontSize: 11, color, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
        {pct >= 0 ? "+" : ""}{pct.toFixed(1)}%
      </span>
    </div>
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
