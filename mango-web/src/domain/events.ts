// Pool de eventos del juego Mango Tycoon.
// Cada evento enseña una situación real de finanzas argentinas.

export type EventChoice = {
  id: string;
  label: string;
  desc: string;
  consequence: string;
  baseDelta: number;   // Mangos ganados/perdidos (escala con gameYear)
  quality: "great" | "ok" | "bad";
  xp: number;
  requiredLessonId?: string;
  chainEventId?: string;   // dispara este evento inmediatamente después
};

export type GameEvent = {
  id: string;
  emoji: string;
  category: "inflacion" | "dolar" | "deuda" | "oportunidad" | "emergencia" | "bonus";
  categoryLabel: string;
  title: string;
  body: string;
  choices: EventChoice[];
  eduNote: string;
  minLevel: number;
  lessonTrigger?: string;  // se encola cuando se completa esta lección
  chainOnly?: boolean;     // solo accesible por cadena/trigger, no por pool aleatorio
};

export type GameEventRecord = {
  month: number;
  year: number;
  eventId: string;
  choiceId: string;
  delta: number;
  xpEarned: number;
};

export type Achievement = {
  id: string;
  emoji: string;
  title: string;
  desc: string;
};

// ── XP / Nivel ────────────────────────────────────────────────────────────────

export const XP_THRESHOLDS = [0, 100, 280, 520, 820, 1200, 1680, 2280, 3020, 3920];

export function levelFromXP(xp: number): number {
  let level = 1;
  for (let i = 0; i < XP_THRESHOLDS.length; i++) {
    if (xp >= XP_THRESHOLDS[i]) level = i + 1;
  }
  return level;
}

export function xpForNextLevel(level: number): number {
  return XP_THRESHOLDS[level] ?? Infinity;
}

export const LEVEL_NAMES = [
  "", "Inversor Novato", "Ahorrista", "Estratega", "Analista",
  "Inversor Avanzado", "Trader Cripto", "Maestro de Pesos", "Gurú Financiero",
  "Leyenda Argentina", "Mango Master",
];

// ── Logros ────────────────────────────────────────────────────────────────────

export const ACHIEVEMENTS: Achievement[] = [
  { id: "primer-mes",      emoji: "🌱", title: "Primer mes",       desc: "Completaste el primer mes de juego" },
  { id: "anti-inflacion",  emoji: "🛡️", title: "Anti-inflación",   desc: "Te protegiste de la inflación correctamente" },
  { id: "dolarizado",      emoji: "💵", title: "Dolarizado",        desc: "Compraste MEP por primera vez" },
  { id: "cuotas-master",   emoji: "🧠", title: "Cuotas master",     desc: "Entendiste el truco de las 12 cuotas" },
  { id: "colchon-listo",   emoji: "🛏️", title: "Colchón listo",    desc: "Resolviste una emergencia sin endeudarte" },
  { id: "deuda-cortada",   emoji: "✂️", title: "Deuda cortada",    desc: "Priorizaste pagar deuda cara" },
  { id: "nivel-3",         emoji: "⭐", title: "Nivel 3",           desc: "Alcanzaste nivel 3 — Estratega" },
  { id: "nivel-5",         emoji: "🌟", title: "Nivel 5",           desc: "Alcanzaste nivel 5 — Inversor Avanzado" },
  { id: "buy-dip",         emoji: "📉", title: "Buy the Dip",       desc: "Compraste CEDEARs en una corrección" },
  { id: "5-meses",         emoji: "🔥", title: "5 meses",           desc: "Completaste 5 meses de Tycoon" },
  { id: "aguinaldo-smart", emoji: "🎯", title: "Aguinaldo pro",     desc: "Invertiste el aguinaldo en lugar de gastarlo" },
  { id: "startup-vivo",    emoji: "🚀", title: "No perdiste con startup", desc: "Sobreviviste la trampa del amigo startup" },
];

export function checkNewAchievements(
  current: string[],
  eventId: string,
  choiceId: string,
  newLevel: number,
  totalMonths: number,
): string[] {
  const earned = new Set(current);

  if (totalMonths >= 1) earned.add("primer-mes");
  if (totalMonths >= 5) earned.add("5-meses");
  if (newLevel >= 3) earned.add("nivel-3");
  if (newLevel >= 5) earned.add("nivel-5");

  const antiInflation =
    (eventId === "inflacion-mensual" && (choiceId === "plazo-fijo" || choiceId === "mep")) ||
    (eventId === "mep-sube" && choiceId === "esperar") ||
    (eventId === "devaluacion-sorpresa" && (choiceId === "tenia-mep" || choiceId === "tenia-cedears"));
  if (antiInflation) earned.add("anti-inflacion");

  if (choiceId === "mep") earned.add("dolarizado");
  if (eventId === "cuotas-trampa" && choiceId === "en-cuotas") earned.add("cuotas-master");
  if (eventId === "colchon-emergencia" && choiceId === "colchon") earned.add("colchon-listo");
  if (eventId === "tarjeta-refinanciada" && choiceId === "pagar-todo") earned.add("deuda-cortada");
  if (eventId === "cedear-baja" && choiceId === "comprar-dip") earned.add("buy-dip");
  if (eventId === "aguinaldo" && (choiceId === "invertir" || choiceId === "mitad")) earned.add("aguinaldo-smart");
  if (eventId === "startup-amigo" && choiceId !== "todo") earned.add("startup-vivo");

  return [...earned];
}

// ── Selección del próximo evento ──────────────────────────────────────────────

export function getNextEvent(
  level: number,
  eventHistory: GameEventRecord[],
): GameEvent {
  const eligible = GAME_EVENTS.filter((e) => e.minLevel <= level && !e.chainOnly);
  const recentIds = new Set(eventHistory.slice(-4).map((h) => h.eventId));
  const fresh = eligible.filter((e) => !recentIds.has(e.id));
  const pool = fresh.length > 0 ? fresh : eligible;
  return pool[eventHistory.length % pool.length];
}

export function getTriggeredEventsForLesson(lessonId: string): string[] {
  return GAME_EVENTS
    .filter((e) => e.lessonTrigger === lessonId)
    .map((e) => e.id);
}

// ── Pool de eventos ───────────────────────────────────────────────────────────

export const GAME_EVENTS: GameEvent[] = [
  {
    id: "inflacion-mensual",
    emoji: "📈",
    category: "inflacion",
    categoryLabel: "INFLACIÓN",
    title: "Inflación del mes: 4.2%",
    body: "El INDEC publicó la inflación mensual. Tus pesos sin invertir perdieron poder adquisitivo. ¿Cómo protegés tus Mangos?",
    choices: [
      {
        id: "pesos",
        label: "Dejar en pesos",
        desc: "Sin moverme. Total siempre fue así.",
        consequence: "La inflación te licuó una parte. Los pesos que no trabajan pierden valor todos los meses.",
        baseDelta: -420,
        quality: "bad",
        xp: 5,
      },
      {
        id: "plazo-fijo",
        label: "Plazo fijo 30 días",
        desc: "Ponerlo en el banco al 3.8% mensual.",
        consequence: "Bien. El plazo fijo te cubrió la inflación y hasta ganaste un poco. Simple pero efectivo.",
        baseDelta: 380,
        quality: "great",
        xp: 40,
        requiredLessonId: "colchon",
      },
      {
        id: "mep",
        label: "Comprar dólar MEP",
        desc: "Dolarizar para no perder contra el peso.",
        consequence: "Excelente. El MEP preserva tu valor en dólares. La inflación no toca lo que está dolarizado.",
        baseDelta: 500,
        quality: "great",
        xp: 55,
        requiredLessonId: "dolar-mep",
      },
    ],
    eduNote: "La inflación en Argentina promedió 4% mensual en los últimos años. Sin invertir, perdés entre 40-50% de poder adquisitivo por año. El plazo fijo o el MEP son los escudos básicos.",
    minLevel: 1,
  },

  {
    id: "cuotas-trampa",
    emoji: "📺",
    category: "deuda",
    categoryLabel: "DEUDA / CUOTAS",
    title: "12 cuotas sin interés — ¿ganga o trampa?",
    body: "Cyber Monday. Smart TV de alta gama: $180.000 en 12 cuotas 'sin interés'. Tenés el efectivo disponible. ¿Comprás?",
    choices: [
      {
        id: "en-cuotas",
        label: "Comprar en 12 cuotas",
        desc: "Cuotas fijas + inflación = deuda que se licúa.",
        consequence: "¡Jugada maestra! Con inflación alta, las cuotas en pesos se licúan. Pagarás con pesos que valen cada vez menos.",
        baseDelta: 350,
        quality: "great",
        xp: 45,
      },
      {
        id: "contado",
        label: "Pagar de contado",
        desc: "Sin deudas, prefiero pagar todo ahora.",
        consequence: "Error clásico. En inflación alta, las cuotas sin interés son una ventaja. El efectivo vale más hoy que mañana.",
        baseDelta: -200,
        quality: "bad",
        xp: 10,
      },
      {
        id: "no-comprar",
        label: "No comprar",
        desc: "No lo necesito ahora mismo.",
        consequence: "Válido si no lo necesitás. Conservás flexibilidad financiera y no sumás compromisos mensuales.",
        baseDelta: 100,
        quality: "ok",
        xp: 25,
      },
    ],
    eduNote: "En Argentina con inflación alta, las cuotas SIN interés en pesos son una ventaja: pagás con dinero que vale cada vez menos. El truco: que realmente lo necesites y que las cuotas no te estrangulen el flujo mensual.",
    minLevel: 1,
  },

  {
    id: "aguinaldo",
    emoji: "🎁",
    category: "bonus",
    categoryLabel: "BONO",
    title: "¡Llegó el aguinaldo!",
    body: "Un sueldo extra entra en tu cuenta. En Tycoon: 2.000 Mangos inesperados. Tenés tres opciones para este capital libre.",
    choices: [
      {
        id: "gastar",
        label: "Gastar todo",
        desc: "Me lo merezco, unas vacaciones.",
        consequence: "Disfrutaste el momento. Pero el aguinaldo se fue sin construir nada. El próximo mes arrancás igual.",
        baseDelta: -600,
        quality: "bad",
        xp: 5,
      },
      {
        id: "invertir",
        label: "Todo a CEDEARs",
        desc: "Dolarizo todo de una.",
        consequence: "¡Bien! Dolarizaste el aguinaldo. Riesgo de mercado, pero te protegés de la inflación a largo plazo.",
        baseDelta: 700,
        quality: "ok",
        xp: 35,
        requiredLessonId: "cedears",
      },
      {
        id: "mitad",
        label: "50% colchón + 50% MEP",
        desc: "La mitad líquida, la mitad dolarizada.",
        consequence: "Perfecto equilibrio. Colchón en pesos para emergencias, el resto dolarizado. Finanzas inteligentes.",
        baseDelta: 1100,
        quality: "great",
        xp: 55,
        requiredLessonId: "dolar-mep",
      },
    ],
    eduNote: "El aguinaldo es la mayor oportunidad del año para construir patrimonio. El error más común: tratarlo como 'plata extra para gastar' en lugar de capital para invertir.",
    minLevel: 1,
  },

  {
    id: "tarjeta-refinanciada",
    emoji: "💳",
    category: "deuda",
    categoryLabel: "DEUDA / TARJETA",
    title: "Tarjeta refinanciada al 90% TEA",
    body: "Llegó el resumen. Tenés saldo refinanciado que te cobra 7.5% mensual (90% anual). También tenés Mangos disponibles. ¿Pagás?",
    choices: [
      {
        id: "minimo",
        label: "Solo el mínimo",
        desc: "Pago lo justo para no quedar mal.",
        consequence: "El mínimo es la trampa. Seguirás pagando intereses altísimos por mucho tiempo. La deuda crece.",
        baseDelta: -500,
        quality: "bad",
        xp: 5,
      },
      {
        id: "mas-minimo",
        label: "El doble del mínimo",
        desc: "Algo más sin quedarme sin efectivo.",
        consequence: "Bien. Reducís el saldo más rápido que pagando el mínimo. Ahorrás en intereses futuros.",
        baseDelta: 250,
        quality: "ok",
        xp: 30,
      },
      {
        id: "pagar-todo",
        label: "Pagar todo el saldo",
        desc: "Evito pagar 90% anual de intereses.",
        consequence: "Excelente. Evitar un 90% anual es mejor que cualquier inversión. Deuda cara fuera del mapa.",
        baseDelta: 600,
        quality: "great",
        xp: 55,
        requiredLessonId: "deuda-cara",
      },
    ],
    eduNote: "La financiación de tarjeta en Argentina ronda el 90-120% TEA. Ninguna inversión accesible supera esa tasa consistentemente. Pagar primero siempre gana.",
    minLevel: 1,
  },

  {
    id: "colchon-emergencia",
    emoji: "🏥",
    category: "emergencia",
    categoryLabel: "EMERGENCIA",
    title: "Emergencia médica inesperada",
    body: "Un familiar necesita un estudio urgente que no cubre la prepaga. Cuesta el equivalente a 800 Mangos. ¿Cómo lo resolvés?",
    choices: [
      {
        id: "colchon",
        label: "Uso mi colchón de emergencia",
        desc: "Para eso lo tenía guardado.",
        consequence: "¡Para esto existe el colchón! Resolviste sin endeudarte. Eso no tiene precio.",
        baseDelta: 200,
        quality: "great",
        xp: 55,
        requiredLessonId: "colchon",
      },
      {
        id: "tarjeta",
        label: "Tarjeta en cuotas",
        desc: "No tengo efectivo, pago en 6 cuotas.",
        consequence: "Tuviste que endeudarte para una emergencia. El colchón evita exactamente esto.",
        baseDelta: -400,
        quality: "bad",
        xp: 10,
      },
      {
        id: "prestamo",
        label: "Préstamo personal",
        desc: "Pido al banco, lo pago en 12 meses.",
        consequence: "Préstamo personal: tasa alta y cuotas fijas. El costo real es mucho mayor al gasto original.",
        baseDelta: -300,
        quality: "bad",
        xp: 15,
      },
    ],
    eduNote: "El colchón de emergencia existe para no convertir imprevistos en deuda. Meta inicial: 1 mes de gastos en instrumento líquido. Meta sana: 3 meses.",
    minLevel: 1,
  },

  {
    id: "bono-trabajo",
    emoji: "🎉",
    category: "bonus",
    categoryLabel: "BONO",
    title: "Bono por desempeño inesperado",
    body: "Tu empresa te dio un bono. En Tycoon: 1.500 Mangos extras. No estaban en el presupuesto. ¿Qué hacés con la plata que 'sobra'?",
    choices: [
      {
        id: "vacaciones",
        label: "Vacaciones (gastar todo)",
        desc: "Me lo gané, me voy de viaje.",
        consequence: "El descanso tiene valor. Pero la plata extra es la mejor oportunidad para avanzar y no la aprovechaste.",
        baseDelta: 0,
        quality: "ok",
        xp: 20,
      },
      {
        id: "deuda-primero",
        label: "Pagar deuda pendiente",
        desc: "Aprovecho para sacarme la deuda de encima.",
        consequence: "Prioridad correcta. Deuda pagada antes de invertir. Ahorrás intereses futuros que componen.",
        baseDelta: 800,
        quality: "great",
        xp: 50,
        requiredLessonId: "deuda-cara",
      },
      {
        id: "mitad-mitad",
        label: "50% vacaciones + 50% inversión",
        desc: "Me doy un gusto y también construyo.",
        consequence: "Equilibrio perfecto. Disfrutás y construís patrimonio al mismo tiempo.",
        baseDelta: 500,
        quality: "great",
        xp: 45,
      },
    ],
    eduNote: "La plata extra (bonos, aguinaldo, devoluciones) no está comprometida. Va directo a activos o a reducir deuda cara. No la 'diluyas' en consumo sin sentido.",
    minLevel: 1,
  },

  {
    id: "mep-sube",
    emoji: "💵",
    category: "dolar",
    categoryLabel: "DÓLAR",
    title: "El dólar MEP subió 8% este mes",
    body: "La brecha cambiaria se amplió. Quienes compraron MEP el mes pasado ganaron 8% en pesos. Vos tenés pesos sin invertir. ¿Actuás ahora?",
    choices: [
      {
        id: "comprar",
        label: "Comprar MEP ahora",
        desc: "Mejor tarde que nunca.",
        consequence: "Compraste después del pico. Pagaste prima. No es el momento ideal: comprás el movimiento ya ejecutado.",
        baseDelta: -100,
        quality: "bad",
        xp: 15,
        requiredLessonId: "dolar-mep",
      },
      {
        id: "esperar",
        label: "Esperar que corrija",
        desc: "Comprar después de una suba fuerte es FOMO.",
        consequence: "Buena paciencia. Esperás una corrección para entrar mejor. Disciplina ante la FOMO.",
        baseDelta: 400,
        quality: "great",
        xp: 50,
      },
      {
        id: "ignorar",
        label: "No hacer nada",
        desc: "No entiendo de eso, lo dejo.",
        consequence: "Tu plata en pesos siguió perdiendo valor. La inacción también tiene un costo.",
        baseDelta: -300,
        quality: "bad",
        xp: 5,
      },
    ],
    eduNote: "Comprar después de una suba fuerte suele ser una mala estrategia. 'Buy the dip' aplica: mejor entrar en correcciones que en picos. La FOMO (miedo a perderse algo) destruye carteras.",
    minLevel: 2,
  },

  {
    id: "devaluacion-sorpresa",
    emoji: "🔥",
    category: "dolar",
    categoryLabel: "DEVALUACIÓN",
    title: "Devaluación sorpresa: dólar oficial +25%",
    body: "El gobierno devaluó el tipo de cambio. Los CEDEARs y el MEP saltaron. Los pesos sin invertir perdieron 20% de valor real de golpe.",
    choices: [
      {
        id: "tenia-mep",
        label: "Tenía plata en MEP",
        desc: "Estaba dolarizado, me protegí.",
        consequence: "¡Perfecto! Tu posición en MEP se revalorizó en pesos. La dolarización previa te salvó.",
        baseDelta: 900,
        quality: "great",
        xp: 60,
        requiredLessonId: "dolar-mep",
      },
      {
        id: "tenia-cedears",
        label: "Tenía CEDEARs",
        desc: "Los CEDEARs ajustan por tipo de cambio.",
        consequence: "¡Muy bien! Los CEDEARs ajustan por el tipo de cambio financiero. Tu inversión se protegió.",
        baseDelta: 700,
        quality: "great",
        xp: 55,
        requiredLessonId: "cedears",
      },
      {
        id: "todo-pesos",
        label: "Tenía todo en pesos",
        desc: "No lo esperaba.",
        consequence: "La devaluación te golpeó fuerte. Los pesos perdieron 20% de poder real de golpe. Esto busca evitar la dolarización.",
        baseDelta: -800,
        quality: "bad",
        xp: 10,
      },
    ],
    eduNote: "Las devaluaciones en Argentina son recurrentes históricamente. La protección más efectiva: una porción del ahorro en activos que ajustan por tipo de cambio (MEP, CEDEARs, directamente en USD).",
    minLevel: 2,
  },

  {
    id: "prepaga-sube",
    emoji: "💊",
    category: "inflacion",
    categoryLabel: "GASTO FIJO",
    title: "La prepaga sube 22% este mes",
    body: "Llegó la notificación: la cuota de la prepaga sube 22%. Suma cientos de pesos más por mes a tus gastos fijos. ¿Cómo lo manejás?",
    choices: [
      {
        id: "ignorar",
        label: "Ignorarlo (ya verás)",
        desc: "Algo se va a arreglar solo.",
        consequence: "Ignorar subas de gastos fijos desbalancea el mes. Al cierre del mes los números no cierran.",
        baseDelta: -600,
        quality: "bad",
        xp: 5,
      },
      {
        id: "recortar",
        label: "Recortás gastos variables",
        desc: "Menos delivery, menos salidas.",
        consequence: "Inteligente. Identificás dónde recortar sin comprometer lo esencial. El presupuesto dinámico funciona.",
        baseDelta: 200,
        quality: "great",
        xp: 40,
        requiredLessonId: "presupuesto",
      },
      {
        id: "cambiar-plan",
        label: "Buscar plan más barato",
        desc: "Llamo y pido una alternativa.",
        consequence: "¡Excelente! Revisar gastos fijos periódicamente puede ahorrar miles. Optimización financiera pura.",
        baseDelta: 400,
        quality: "great",
        xp: 50,
      },
    ],
    eduNote: "Los gastos fijos son los más peligrosos: invisibles hasta que se acumulan. Revisarlos dos veces por año puede liberar el equivalente a medio sueldo anual.",
    minLevel: 2,
  },

  {
    id: "cedear-baja",
    emoji: "📉",
    category: "oportunidad",
    categoryLabel: "OPORTUNIDAD",
    title: "Apple cayó 15% en el NASDAQ",
    body: "El mercado americano tuvo una corrección. AAPL bajó 15% en dólares. El CEDEAR en pesos refleja esa caída. ¿Es momento de actuar?",
    choices: [
      {
        id: "vender-panico",
        label: "Vender los que tengo (pánico)",
        desc: "Mejor salir antes de que baje más.",
        consequence: "Vender con pérdida por miedo es el error clásico del inversor minorista. El mercado suele recuperarse.",
        baseDelta: -600,
        quality: "bad",
        xp: 5,
      },
      {
        id: "esperar",
        label: "Aguantar sin hacer nada",
        desc: "A largo plazo debería recuperar.",
        consequence: "Paciencia correcta. Aguantar la volatilidad es clave para el inversor de largo plazo.",
        baseDelta: 200,
        quality: "ok",
        xp: 25,
        requiredLessonId: "cedears",
      },
      {
        id: "comprar-dip",
        label: "Comprar más (buy the dip)",
        desc: "Empresa sólida a descuento. Oportunidad.",
        consequence: "Inversión value. Compraste una empresa sólida a descuento. Si el mercado recupera, ganás doble.",
        baseDelta: 750,
        quality: "great",
        xp: 60,
        requiredLessonId: "cedears",
      },
    ],
    eduNote: "Las correcciones del mercado son oportunidades para el inversor de largo plazo. Vender en pánico bloquea la pérdida; aguantar o comprar más captura la recuperación histórica.",
    minLevel: 3,
  },

  {
    id: "plazo-fijo-vence",
    emoji: "🏦",
    category: "oportunidad",
    categoryLabel: "PLAZO FIJO",
    title: "Tu plazo fijo de 30 días venció",
    body: "Ganaste 3.8% mensual. Ahora toca decidir qué hacer con el capital + los intereses generados. El contexto macro es incierto.",
    choices: [
      {
        id: "gastar",
        label: "Retirar y gastar las ganancias",
        desc: "Me lo merezco.",
        consequence: "Gastar el rendimiento anula el interés compuesto. La magia del plazo fijo está en reinvertir.",
        baseDelta: -150,
        quality: "bad",
        xp: 8,
      },
      {
        id: "renovar",
        label: "Renovar otro mes completo",
        desc: "Si funcionó, lo mantengo.",
        consequence: "Consistencia. El plazo fijo renovado sigue generando rendimiento. El interés compuesto trabaja.",
        baseDelta: 380,
        quality: "ok",
        xp: 30,
      },
      {
        id: "mep-ahora",
        label: "Pasarlo a MEP",
        desc: "Dolarizo las ganancias y el capital.",
        consequence: "Movida inteligente si el contexto macro lo justifica. Dolarizás ganancias y capital de una.",
        baseDelta: 500,
        quality: "great",
        xp: 50,
        requiredLessonId: "dolar-mep",
      },
    ],
    eduNote: "El interés compuesto requiere reinvertir las ganancias. Un plazo fijo de 3.8% mensual que se renueva durante un año da un retorno muy superior a uno donde se retiran los intereses.",
    minLevel: 2,
  },

  {
    id: "startup-amigo",
    emoji: "🚀",
    category: "oportunidad",
    categoryLabel: "RIESGO ALTO",
    title: "Un amigo te pide invertir en su startup",
    body: "Tu amigo de confianza tiene una idea prometedora. Necesita 3.000 Mangos y promete devolverte 5.000 en 6 meses. ¿Invertís?",
    choices: [
      {
        id: "todo",
        label: "Invertir todo (3.000 M)",
        desc: "Confío en él, es una gran oportunidad.",
        consequence: "La startup no despegó. Perdiste los Mangos y la dinámica de la amistad cambió. Las startups fallan el 90% de las veces.",
        baseDelta: -2000,
        quality: "bad",
        xp: 10,
      },
      {
        id: "poco",
        label: "Solo 500 Mangos",
        desc: "Invierto solo lo que puedo perder.",
        consequence: "Inteligente. Invertís lo que podés perder. Si falla: pérdida tolerable. Si sale bien: gran upside.",
        baseDelta: 300,
        quality: "great",
        xp: 55,
      },
      {
        id: "no",
        label: "No invertir",
        desc: "No mezclo amistad con dinero.",
        consequence: "Decisión válida. 'Nunca mezcles amistad con dinero' es un principio que muchos aprenden de la peor manera.",
        baseDelta: 100,
        quality: "ok",
        xp: 35,
      },
    ],
    eduNote: "Inversiones en startups de amigos: alto riesgo, poco control y mezcla de relaciones personales con dinero. Si lo hacés, solo con capital que puedas perder completamente.",
    minLevel: 4,
  },

  {
    id: "sueldo-ajuste",
    emoji: "💼",
    category: "bonus",
    categoryLabel: "SUELDO",
    title: "Negociación de sueldo: ¿cuánto pedís?",
    body: "Tu empresa abre la paritaria. La inflación acumulada fue 48% en el último año y tu sueldo no se ajustó hace 8 meses. ¿Cuánto pedís?",
    choices: [
      {
        id: "menos",
        label: "Pedir 30% (menos que inflación)",
        desc: "No quiero parecer ambicioso.",
        consequence: "Perdiste poder adquisitivo. Siempre negociá al menos igual a la inflación pasada como piso mínimo.",
        baseDelta: -300,
        quality: "bad",
        xp: 8,
      },
      {
        id: "igual",
        label: "Pedir 48% (igual a inflación)",
        desc: "Empatar la inflación es razonable.",
        consequence: "Mantuviste tu poder adquisitivo real. Es el piso, no el techo. Proyectá inflación futura también.",
        baseDelta: 300,
        quality: "ok",
        xp: 35,
      },
      {
        id: "mas",
        label: "Pedir 65% (inflación + crecimiento)",
        desc: "Recupero lo perdido más un margen real.",
        consequence: "¡Excelente! Negociaste recuperar lo perdido más un margen de crecimiento real. El trabajo bien hecho merece más.",
        baseDelta: 700,
        quality: "great",
        xp: 55,
      },
    ],
    eduNote: "En Argentina, el sueldo nominal puede subir y aun así perdés poder adquisitivo si sube menos que la inflación. La pauta: al menos inflación pasada + un % por productividad.",
    minLevel: 3,
  },

  // ── Escenario: La Trampa de la Tarjeta (triggered por "presupuesto") ─────────

  {
    id: "impuesto-cuenta-bloqueada",
    emoji: "🏛️",
    category: "emergencia",
    categoryLabel: "CRISIS",
    title: "Impuesto nuevo: tu cuenta quedó bloqueada",
    body: "El gobierno subió las retenciones bancarias al 1.2% sobre débitos. Tu banco bloqueó tu cuenta 48 horas para verificar identidad. El vencimiento de tu tarjeta es en 2 días.",
    choices: [
      {
        id: "otra-cuenta",
        label: "Pago desde otra cuenta",
        desc: "Tengo Naranja X o Mercado Pago para el vencimiento.",
        consequence: "Perfecto. Diversificar medios de pago te salvó. La tarjeta se pagó en tiempo y sin intereses.",
        baseDelta: 300,
        quality: "great",
        xp: 50,
      },
      {
        id: "esperar",
        label: "Espero que se desbloquee",
        desc: "No tengo otra cuenta, espero al banco.",
        consequence: "La cuenta tardó 72 horas. El vencimiento pasó. Ahora tenés intereses automáticos y el banco te llama.",
        baseDelta: -100,
        quality: "bad",
        xp: 15,
        chainEventId: "pago-emergencia-tarjeta",
      },
      {
        id: "ir-banco",
        label: "Voy al banco en persona",
        desc: "Trámite presencial para desbloquear urgente.",
        consequence: "Tardó todo el día, pero lo desbloqueaste. El banco igual registró la demora y quiere verificar el pago de la tarjeta.",
        baseDelta: 0,
        quality: "ok",
        xp: 25,
        chainEventId: "pago-emergencia-tarjeta",
      },
    ],
    eduNote: "En Argentina siempre conviene tener al menos dos medios de pago (banco + billetera virtual). Una sola fuente puede bloquearse por AFIP, BCRA o por verificación AML y dejarte sin acceso en el peor momento.",
    minLevel: 1,
    lessonTrigger: "presupuesto",
  },

  {
    id: "pago-emergencia-tarjeta",
    emoji: "💳",
    category: "deuda",
    categoryLabel: "DEUDA URGENTE",
    title: "¡Vencimiento de tarjeta con cuenta bloqueada!",
    body: "Cuenta aún bloqueada. Tu tarjeta tiene $40.000 de deuda al 7.5% mensual (90% TEA). El mínimo son $4.000. Cada día de atraso genera intereses y puede afectar tu historial en el BCRA.",
    choices: [
      {
        id: "pagar-todo",
        label: "Pagar todo el saldo ($40.000)",
        desc: "Gestiono el pago desde homebanking de otro banco.",
        consequence: "¡Excelente gestión de crisis! Pagaste todo, evitaste intereses y mantuviste historial crediticio limpio.",
        baseDelta: 500,
        quality: "great",
        xp: 60,
        requiredLessonId: "deuda-cara",
      },
      {
        id: "pagar-minimo",
        label: "Solo el mínimo ($4.000)",
        desc: "Por ahora pago lo justo para no quedar en mora.",
        consequence: "Evitaste la mora pero el saldo restante ($36.000) acumula 7.5% mensual. El banco además marcó el pago como 'mínimo' — señal de alerta.",
        baseDelta: -400,
        quality: "bad",
        xp: 10,
        chainEventId: "investigacion-fraude-banco",
      },
      {
        id: "refinanciar",
        label: "Refinanciar todo (no pagar nada)",
        desc: "El banco me permite diferir el total al próximo mes.",
        consequence: "Refinanciaste $40.000 al 7.5% mensual. El próximo mes debés $43.000 solo de capital + intereses. El banco encendió alertas.",
        baseDelta: -700,
        quality: "bad",
        xp: 8,
        chainEventId: "espiral-intereses",
      },
    ],
    eduNote: "El pago mínimo de tarjeta es la trampa más cara de las finanzas personales. $40.000 al 7.5% mensual genera $3.000 de interés por mes — el equivalente a tirar un billete a la basura cada 30 días.",
    minLevel: 1,
    chainOnly: true,
  },

  {
    id: "investigacion-fraude-banco",
    emoji: "🔍",
    category: "emergencia",
    categoryLabel: "ALERTA BANCO",
    title: "El banco sospecha: te llaman por actividad inusual",
    body: "Tres meses de pago mínimo + cuenta bloqueada por AFIP. El banco envió un agente de prevención de fraude. Quieren confirmar que sos vos quien maneja la cuenta.",
    choices: [
      {
        id: "documentos",
        label: "Presento toda la documentación",
        desc: "DNI, comprobantes de ingresos, historial.",
        consequence: "El banco verificó que todo está en regla. Levantaron la alerta. Te recomendaron un plan de pagos para bajar la deuda.",
        baseDelta: 250,
        quality: "great",
        xp: 45,
      },
      {
        id: "movimiento-raro",
        label: "Hubo un movimiento raro sin querer",
        desc: "Le presté la cuenta a alguien una vez.",
        consequence: "El banco congeló la cuenta 30 días adicionales por posible cesión no autorizada. Multa + trámite engorroso.",
        baseDelta: -600,
        quality: "bad",
        xp: 12,
      },
      {
        id: "no-atender",
        label: "No atiendo el teléfono",
        desc: "No sé quién llama, podría ser estafa.",
        consequence: "El banco interpretó la falta de respuesta como confirmación de actividad sospechosa. Bloquearon la tarjeta definitivamente hasta presentarte en persona.",
        baseDelta: -900,
        quality: "bad",
        xp: 5,
      },
    ],
    eduNote: "Los bancos en Argentina tienen obligación regulatoria de reportar operaciones sospechosas a la UIF (Unidad de Información Financiera). Atender estas verificaciones prontamente y con documentación evita bloqueos que pueden durar meses.",
    minLevel: 1,
    chainOnly: true,
  },

  {
    id: "espiral-intereses",
    emoji: "🌀",
    category: "deuda",
    categoryLabel: "DEUDA CRECIENTE",
    title: "La deuda creció sola: el interés compuesto en contra",
    body: "Refinanciaste $40.000. Tres meses después, con 7.5% mensual acumulado, la deuda es $52.200. El banco exige ahora un pago mayor o suma mora al BCRA.",
    choices: [
      {
        id: "cancelar-todo",
        label: "Cancelar toda la deuda de una vez",
        desc: "Uso mis ahorros para salir del pozo.",
        consequence: "Dolor de corto plazo, alivio de largo plazo. Saliste del ciclo de intereses. Nunca más refinanciar deuda cara.",
        baseDelta: 700,
        quality: "great",
        xp: 65,
        requiredLessonId: "deuda-cara",
      },
      {
        id: "minimos-siempre",
        label: "Seguir pagando mínimos",
        desc: "No tengo de otra por ahora.",
        consequence: "En 6 meses habrás pagado más de $20.000 solo en intereses. La deuda original sigue casi intacta. Trampa clásica de las tarjetas argentinas.",
        baseDelta: -1200,
        quality: "bad",
        xp: 5,
      },
      {
        id: "prestamo-mas-barato",
        label: "Refinancio con préstamo personal al 60% TNA",
        desc: "Cambio deuda al 90% TEA por una al 60% TNA.",
        consequence: "Movida correcta. Bajaste la tasa de interés. Ahora pagás menos por mes y el capital baja más rápido. Pero no te relajes.",
        baseDelta: 200,
        quality: "ok",
        xp: 35,
      },
    ],
    eduNote: "El interés compuesto sobre deuda funciona exactamente igual que sobre una inversión, pero en tu contra. $40.000 al 7.5% mensual se convierte en $80.000 en solo 10 meses si no pagás el capital.",
    minLevel: 1,
    chainOnly: true,
  },

  // ── Escenario: El Colchón bajo Presión (triggered por "colchon") ─────────────

  {
    id: "emergencia-auto",
    emoji: "🚗",
    category: "emergencia",
    categoryLabel: "EMERGENCIA",
    title: "El auto falla: $80.000 urgente hoy",
    body: "Falla eléctrica grave. El taller cobra $80.000 y no arranca sin ese arreglo. Tenés que decidir AHORA cómo cubrirlo.",
    choices: [
      {
        id: "colchon",
        label: "Uso mi colchón de emergencias",
        desc: "Para esto lo tenía ahorrado.",
        consequence: "¡Perfecto! Para esto existe el colchón. Sin deuda, sin intereses, sin stress. Lo reconstituís en los próximos meses.",
        baseDelta: 300,
        quality: "great",
        xp: 60,
        requiredLessonId: "colchon",
      },
      {
        id: "tarjeta-cuotas",
        label: "Tarjeta en 12 cuotas 'sin interés'",
        desc: "$6.667 por mes durante un año.",
        consequence: "En inflación alta, las cuotas se licúan. Pero $6.667 fijos por mes durante 12 meses puede ahogar tu presupuesto si surge otra emergencia.",
        baseDelta: -200,
        quality: "bad",
        xp: 15,
        chainEventId: "cuotas-auto-presion",
      },
      {
        id: "prestamo-90",
        label: "Préstamo personal al 90% TNA",
        desc: "El banco me presta en el día.",
        consequence: "Tasa carísima para una emergencia. En 12 meses pagás casi el doble. El colchón habría sido infinitamente más barato.",
        baseDelta: -600,
        quality: "bad",
        xp: 10,
      },
    ],
    eduNote: "El colchón de emergencias existe para exactamente esto: evitar que un imprevisto se convierta en deuda cara. 3 meses de gastos en un instrumento líquido (caja de ahorro, plazo fijo 30 días) es el estándar.",
    minLevel: 1,
    lessonTrigger: "colchon",
  },

  {
    id: "cuotas-auto-presion",
    emoji: "📅",
    category: "deuda",
    categoryLabel: "CUOTAS FIJAS",
    title: "Las cuotas del auto aprietan el presupuesto",
    body: "Las 12 cuotas del auto son $6.667 por mes. Este mes también llegó la suba de servicios (+$8.000). El presupuesto no cierra: te faltan $4.500.",
    choices: [
      {
        id: "ajustar",
        label: "Ajusto otros gastos para compensar",
        desc: "Menos delivery, menos salidas este mes.",
        consequence: "Gestión de presupuesto bajo presión. Recortaste donde había margen y cerraste el mes sin atrasar ningún pago. Eso se llama control financiero real.",
        baseDelta: 350,
        quality: "great",
        xp: 50,
        requiredLessonId: "presupuesto",
      },
      {
        id: "sigo-igual",
        label: "Sigo gastando igual, algo se arreglará",
        desc: "No me gusta restringirme.",
        consequence: "No se arregló solo. Al final del mes atrasaste 2 cuotas del auto. El banco registró la mora.",
        baseDelta: -500,
        quality: "bad",
        xp: 8,
        chainEventId: "mora-cuotas-bcra",
      },
      {
        id: "cancelar-resto",
        label: "Cancelo las cuotas restantes con mis ahorros",
        desc: "Prefiero quedar sin deuda.",
        consequence: "Bien. Usaste ahorros para cancelar la deuda y liberar el flujo mensual. Ahora reconstituis los ahorros sin la presión de las cuotas.",
        baseDelta: 200,
        quality: "ok",
        xp: 35,
      },
    ],
    eduNote: "Las cuotas fijas son gastos comprometidos: no se pueden negociar mes a mes. En finanzas personales, la regla es que tus compromisos fijos (cuotas + servicios + alquiler) no deben superar el 50% de tus ingresos.",
    minLevel: 1,
    chainOnly: true,
  },

  {
    id: "mora-cuotas-bcra",
    emoji: "⚠️",
    category: "deuda",
    categoryLabel: "MORA / VERAZ",
    title: "Entraste en mora: el banco reportó al BCRA",
    body: "Atrasaste 2 cuotas del auto. El banco reportó la deuda al BCRA (Central de Deudores). Aparecer en el Veraz con mora puede cerrar puertas de crédito por hasta 5 años.",
    choices: [
      {
        id: "pagar-todo-atrasado",
        label: "Pago todo lo atrasado + capital",
        desc: "Regularizo la situación de una vez.",
        consequence: "Hiciste lo correcto: regularizaste. La mora queda registrada, pero 'regularizada'. En 6 meses el historial mejora notablemente.",
        baseDelta: 600,
        quality: "great",
        xp: 65,
        requiredLessonId: "deuda-cara",
      },
      {
        id: "negociar-quita",
        label: "Negocio una quita del 30% con el banco",
        desc: "El banco prefiere cobrar algo que nada.",
        consequence: "Los bancos aceptan quitas cuando la alternativa es no cobrar. Pagaste el 70% y cerraste la deuda. El historial queda con observación pero sin mora activa.",
        baseDelta: 250,
        quality: "ok",
        xp: 40,
      },
      {
        id: "ignorar-veraz",
        label: "Ignoro el Veraz, total es una sola cuota",
        desc: "Tampoco es para tanto.",
        consequence: "La mora creció mes a mes. Ahora tenés 4 cuotas impagas y el banco inició gestión de cobro. El Veraz te va a complicar cualquier trámite financiero por años.",
        baseDelta: -1500,
        quality: "bad",
        xp: 3,
      },
    ],
    eduNote: "El BCRA Central de Deudores (antes Veraz) registra deudas mayores a $1.000 con más de 30 días de atraso. Una mora 'regularizada' es mejor que una activa, pero la mejor estrategia siempre es no entrar en mora.",
    minLevel: 1,
    chainOnly: true,
  },

  {
    id: "riesgo-pais",
    emoji: "🌎",
    category: "oportunidad",
    categoryLabel: "MACRO",
    title: "Riesgo país cayó 400 puntos",
    body: "Las reformas generan confianza. El riesgo país bajó de 1800 a 1400 puntos. Los bonos argentinos subieron 15%. ¿Tenías exposición?",
    choices: [
      {
        id: "tenia-bonos",
        label: "Sí, tenía bonos (AL30)",
        desc: "Compré cuando el riesgo era alto.",
        consequence: "¡Ganadora! Los bonos soberanos te dieron 15%. El riesgo país alto también es oportunidad para el valiente.",
        baseDelta: 900,
        quality: "great",
        xp: 65,
      },
      {
        id: "comprar-ahora",
        label: "Comprar bonos ahora",
        desc: "Puede seguir subiendo.",
        consequence: "Llegaste después de la movida principal, pero la tendencia puede continuar si las reformas siguen.",
        baseDelta: 200,
        quality: "ok",
        xp: 25,
      },
      {
        id: "nada",
        label: "Nada, estaba en pesos",
        desc: "No seguía el mercado de bonos.",
        consequence: "Perdiste una gran oportunidad. Seguir el contexto macro en Argentina es parte de invertir aquí.",
        baseDelta: -200,
        quality: "bad",
        xp: 10,
      },
    ],
    eduNote: "El riesgo país mide el sobrecosto que paga Argentina para endeudarse. Cuando baja, los bonos suben fuerte. Volátil y de alto riesgo, pero los rebotes argentinos históricamente son explosivos.",
    minLevel: 5,
  },
];
