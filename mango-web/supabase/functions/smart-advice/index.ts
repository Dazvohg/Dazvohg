// Deno Edge Function — generates personalised financial advice using Claude
// POST /functions/v1/smart-advice
// Body: { summary: FinancialSummary }
// Returns: { advices: AdviceItem[] }

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_API_KEY  = Deno.env.get("ANTHROPIC_API_KEY")        ?? "";
const SUPABASE_URL       = Deno.env.get("SUPABASE_URL")             ?? "";
const SUPABASE_SERVICE   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// ── Types ────────────────────────────────────────────────────────────────────

interface FinancialSummary {
  salary: number;
  totalExpenses: number;
  totalDebt: number;
  totalLiquid: number;
  inflationMonthly: number | null;
  countryRisk: number | null;
  blueDolar: number;
  mepDolar: number;
  riskLevel: "conservador" | "moderado" | "agresivo";
  simPnlPct: number | null;
  topExpenseCategory: string | null;
  goalsCount: number;
  hasCards: boolean;
}

interface AdviceItem {
  title: string;
  body: string;
  tab: "expenses" | "goals" | "learn" | "profile" | "simulador" | "mercados" | "tycoon";
  urgency: "high" | "medium" | "low";
}

// ── Fallback advices (returned when Claude is unreachable or response unparseable) ──

const FALLBACK_ADVICES: AdviceItem[] = [
  {
    title: "Revisá tus gastos del mes",
    body: "Comparar tus gastos reales contra tu sueldo te ayuda a detectar fugas de dinero antes de que se vuelvan un problema.",
    tab: "expenses",
    urgency: "medium",
  },
  {
    title: "Definí una meta de ahorro",
    body: "Tener un objetivo concreto — aunque sea pequeño — aumenta la probabilidad de ahorrar cada mes. Empezá con el 10% de tu sueldo.",
    tab: "goals",
    urgency: "medium",
  },
  {
    title: "Conocé el dólar MEP",
    body: "El dólar MEP es una forma legal de dolarizarte desde Argentina. Aprendé cómo funciona para proteger tus ahorros de la inflación.",
    tab: "learn",
    urgency: "low",
  },
];

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(s: FinancialSummary): string {
  const fmt = (n: number) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

  const lines = [
    `Sos "Asesor CheMonei", un asistente financiero argentino que habla de vos a vos, con tono directo y cercano.`,
    ``,
    `Resumen financiero del usuario:`,
    `- Sueldo mensual: ${fmt(s.salary)}`,
    `- Gastos del mes: ${fmt(s.totalExpenses)} (${s.salary > 0 ? Math.round((s.totalExpenses / s.salary) * 100) : "?"}% del sueldo)`,
    `- Deuda total (tarjetas): ${fmt(s.totalDebt)}`,
    `- Liquidez (efectivo + billeteras): ${fmt(s.totalLiquid)}`,
    `- Inflación mensual estimada: ${s.inflationMonthly != null ? s.inflationMonthly + "%" : "no disponible"}`,
    `- Riesgo país: ${s.countryRisk != null ? s.countryRisk + " bps" : "no disponible"}`,
    `- Dólar Blue: $${s.blueDolar} ARS`,
    `- Dólar MEP: $${s.mepDolar} ARS`,
    `- Perfil de riesgo inversor: ${s.riskLevel}`,
    `- P&L del simulador de portafolio: ${s.simPnlPct != null ? s.simPnlPct.toFixed(1) + "%" : "sin datos"}`,
    `- Categoría de gasto más alta: ${s.topExpenseCategory ?? "sin datos"}`,
    `- Metas financieras activas: ${s.goalsCount}`,
    `- ¿Tiene tarjetas de crédito?: ${s.hasCards ? "sí" : "no"}`,
    ``,
    `Basándote en este resumen, generá exactamente 3 consejos financieros personalizados para Argentina.`,
    `Mencionar pesos, inflación, dólar MEP, tarjetas, o metas según corresponda.`,
    `Cada consejo debe tener: un título (máximo 25 palabras), un cuerpo explicativo (máximo 60 palabras) y`,
    `asignarlo a una de estas pestañas de la app: expenses, goals, learn, profile, simulador, mercados, tycoon.`,
    `También indicar urgencia: high, medium o low.`,
    ``,
    `Respondé SOLO con un JSON válido con esta forma exacta, sin texto adicional:`,
    `[`,
    `  { "title": "...", "body": "...", "tab": "expenses|goals|learn|profile|simulador|mercados|tycoon", "urgency": "high|medium|low" },`,
    `  { "title": "...", "body": "...", "tab": "...", "urgency": "..." },`,
    `  { "title": "...", "body": "...", "tab": "...", "urgency": "..." }`,
    `]`,
  ];

  return lines.join("\n");
}

// ── Claude API call ───────────────────────────────────────────────────────────

async function fetchAdvicesFromClaude(summary: FinancialSummary): Promise<AdviceItem[]> {
  const prompt = buildPrompt(summary);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key":         ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type":      "application/json",
    },
    body: JSON.stringify({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Claude API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const text: string = data?.content?.[0]?.text ?? "";

  // Extract JSON array — Claude sometimes wraps it in markdown fences
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("No JSON array found in Claude response");

  const parsed = JSON.parse(jsonMatch[0]) as AdviceItem[];

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Parsed advices is not a non-empty array");
  }

  // Validate each item has the required shape
  const validTabs = new Set(["expenses", "goals", "learn", "profile", "simulador", "mercados", "tycoon"]);
  const validUrgencies = new Set(["high", "medium", "low"]);

  return parsed.slice(0, 3).map((item) => ({
    title:   typeof item.title   === "string" ? item.title   : "Consejo financiero",
    body:    typeof item.body    === "string" ? item.body    : "",
    tab:     validTabs.has(item.tab)          ? item.tab     : "learn",
    urgency: validUrgencies.has(item.urgency) ? item.urgency : "medium",
  })) as AdviceItem[];
}

// ── Handler ───────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE);

    // Auth: require Bearer token
    const token = req.headers.get("authorization")?.replace("Bearer ", "") ?? "";
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const body = await req.json() as { summary: FinancialSummary };
    const { summary } = body;

    if (!summary || typeof summary !== "object") {
      return new Response(JSON.stringify({ error: "Missing or invalid 'summary' field" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    let advices: AdviceItem[];
    try {
      advices = await fetchAdvicesFromClaude(summary);
    } catch (claudeErr) {
      console.error("smart-advice: Claude failed, using fallback:", claudeErr);
      advices = FALLBACK_ADVICES;
    }

    return new Response(JSON.stringify({ advices }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("smart-advice error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
