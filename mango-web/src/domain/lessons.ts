import { budgetHealth, money, totalDebt, totalLiquid } from "./finance";
import type { AppState } from "./types";
import { getTriggeredEventsForLesson } from "./events";

import type { RiskLevel } from "./types";

export type Lesson = {
  id: string;
  title: string;
  subtitle: string;
  level: "inicial" | "medio";
  tags: string[];
  recommendedFor: RiskLevel[]; // perfiles que deberían priorizarla
  sections: Array<{ title: string; body: string }>;
  example: (state: AppState) => string;
  quiz: {
    question: string;
    options: string[];
    answerIndex: number;
    explanation: string;
  };
};

export const lessonReward = 650;

export const lessons: Lesson[] = [
  {
    id: "presupuesto",
    title: "Presupuesto sin volverte loco",
    subtitle: "No es prohibirte vivir: es decidir antes de gastar.",
    level: "inicial",
    tags: ["Gastos", "Habitos"],
    recommendedFor: ["conservador", "moderado", "agresivo"],
    sections: [
      {
        title: "La idea simple",
        body: "Un presupuesto es un limite elegido antes de gastar. No te dice que no podes comprar nada; te dice cuanto espacio tenes para cada categoria sin romper el mes.",
      },
      {
        title: "Por que funciona",
        body: "Cuando no hay limite, cada compra parece chica por separado. El problema aparece cuando todas se juntan. Un presupuesto convierte muchas decisiones chicas en una sola decision clara.",
      },
      {
        title: "Como usarlo en Mango",
        body: "Elegis una categoria, pones un limite mensual y miras el semaforo. Verde significa tranquilo, amarillo significa bajar un cambio, rojo significa que hay que compensar en otra parte.",
      },
    ],
    example: (state) => {
      const budget = budgetHealth(state);
      if (budget.status === "empty") {
        return "Ejemplo: si delivery se te va de las manos, podrias poner $80.000 mensuales. Cada pedido se descuenta de ese margen.";
      }
      return `Con tus presupuestos actuales usaste ${budget.pct.toFixed(0)}%: ${money(budget.totalSpent)} de ${money(budget.totalLimit)}. Ese numero te dice si el mes viene ordenado o pide ajuste.`;
    },
    quiz: {
      question: "Para que sirve principalmente un presupuesto?",
      options: ["Para castigarte si gastas", "Para decidir limites antes de gastar", "Para ocultar gastos chicos"],
      answerIndex: 1,
      explanation: "Exacto. El presupuesto no castiga: anticipa. Te da margen y evita sorpresas.",
    },
  },
  {
    id: "deuda-cara",
    title: "Por que pagar deuda puede ser invertir",
    subtitle: "La tarjeta refinanciada suele ganarle a cualquier rendimiento posible.",
    level: "inicial",
    tags: ["Tarjetas", "Interes"],
    recommendedFor: ["conservador", "moderado", "agresivo"],
    sections: [
      {
        title: "La comparacion correcta",
        body: "Si una inversion te rinde 30% anual, parece mucho. Pero si tu tarjeta te cobra 90% anual por refinanciar, cada peso que pagas ahi evita un costo mucho mayor.",
      },
      {
        title: "El minimo es tiempo caro",
        body: "Pagar el minimo evita el problema hoy, pero compra tiempo a una tasa altisima. Por eso CheMonei insiste en pagar mas que el minimo cuando sea posible.",
      },
      {
        title: "Regla practica",
        body: "Primero deuda cara, despues inversion. La excepcion seria una deuda a tasa realmente baja y fija, pero no suele ser el caso del saldo de tarjeta refinanciado.",
      },
    ],
    example: (state) => {
      const debt = totalDebt(state);
      if (!debt) return "Ejemplo: si tuvieras $100.000 refinanciados al 90% TEA, podrias terminar pagando mucho mas solo por esperar.";
      return `En tu caso hay ${money(debt)} cargados en tarjetas. Si parte de eso se refinancia, pagar extra funciona como evitar intereses futuros.`;
    },
    quiz: {
      question: "Si tu tarjeta cobra 90% TEA y una inversion promete 30% anual, que suele convenir primero?",
      options: ["Pagar deuda", "Invertir igual", "Comprar mas cosas en cuotas"],
      answerIndex: 0,
      explanation: "Bien. Evitar un costo del 90% suele ser mejor que perseguir un rendimiento del 30%.",
    },
  },
  {
    id: "colchon",
    title: "El colchon de emergencia",
    subtitle: "La plata mas aburrida es la que te salva de endeudarte.",
    level: "inicial",
    tags: ["Ahorro", "Seguridad"],
    recommendedFor: ["conservador", "moderado", "agresivo"],
    sections: [
      {
        title: "Que es",
        body: "Es plata separada para emergencias reales: salud, arreglo urgente, quedarse sin ingreso, problema familiar. No es plata para vacaciones ni compras impulsivas.",
      },
      {
        title: "Cuanto tener",
        body: "Una meta inicial puede ser un mes de gastos. Despues, tres meses. No hace falta llegar perfecto de una: se construye de a poco.",
      },
      {
        title: "Donde ponerlo",
        body: "Tiene que estar liquido y relativamente estable. Una billetera que rinde o un money market puede servir. No deberia estar en cripto ni en algo que pueda caer fuerte justo cuando lo necesitas.",
      },
    ],
    example: (state) => {
      const liquid = totalLiquid(state);
      return `Hoy tenes ${money(liquid)} liquidos cargados. CheMonei puede ayudarte a separar que parte es colchon y que parte se puede invertir o usar para deuda.`;
    },
    quiz: {
      question: "Donde NO conviene poner el colchon de emergencia?",
      options: ["Instrumento liquido", "Money market estable", "Activo muy volatil"],
      answerIndex: 2,
      explanation: "Correcto. El colchon no busca ganar mucho: busca estar disponible cuando todo se complica.",
    },
  },
  {
    id: "dolar-mep",
    title: "Dolar MEP explicado facil",
    subtitle: "Dolarizar ahorro blanco sin comprar dolar oficial.",
    level: "inicial",
    tags: ["Dolar", "Argentina"],
    recommendedFor: ["conservador", "moderado"],
    sections: [
      {
        title: "Que es",
        body: "El dolar MEP es una forma legal de comprar dolares usando bonos. En vez de ir al banco por dolar oficial, compras un bono en pesos y lo vendes en dolares.",
      },
      {
        title: "Para que sirve",
        body: "Sirve para preservar valor en dolares, especialmente si tu objetivo no es gastar esa plata en el corto plazo. No es magia: el precio puede variar y hay comisiones.",
      },
      {
        title: "Cuando pensarlo",
        body: "Tiene sentido cuando ya tenes orden basico: sin deuda cara descontrolada, con algo de liquidez y con una razon clara para dolarizar.",
      },
    ],
    example: (state) => {
      const amount = 100000;
      const usd = Math.floor(amount / state.rates.mep);
      return `Con MEP a $${Math.round(state.rates.mep).toLocaleString("es-AR")}, ${money(amount)} comprarian cerca de US$${usd}.`;
    },
    quiz: {
      question: "Que operacion resume mejor al dolar MEP?",
      options: ["Comprar un bono en pesos y venderlo en dolares", "Pedir un prestamo", "Comprar cripto anonima"],
      answerIndex: 0,
      explanation: "Exacto. El puente del MEP es el bono: entra en pesos, sale en dolares.",
    },
  },
  {
    id: "cedears",
    title: "CEDEARs sin humo",
    subtitle: "Empresas de afuera compradas desde Argentina.",
    level: "medio",
    tags: ["Inversion", "Dolares"],
    recommendedFor: ["moderado", "agresivo"],
    sections: [
      {
        title: "Que compras",
        body: "Un CEDEAR representa una parte de una accion extranjera. Podes comprar Apple, Coca-Cola o un ETF como SPY desde una cuenta local y en pesos.",
      },
      {
        title: "Por que dolariza",
        body: "Su precio en pesos sigue dos cosas: el precio de la accion afuera y el tipo de cambio financiero. Por eso puede proteger contra devaluacion, aunque tambien puede bajar si la accion cae.",
      },
      {
        title: "Riesgo real",
        body: "No es plazo fijo. Si el mercado baja, tu CEDEAR baja. Para empezar, suele ser mas sano diversificar que apostar todo a una empresa de moda.",
      },
    ],
    example: () =>
      "Ejemplo: SPY reparte el riesgo entre muchas empresas grandes de Estados Unidos. NVIDIA sola puede subir mas, pero tambien caer mucho mas.",
    quiz: {
      question: "Que afecta el precio de un CEDEAR en pesos?",
      options: ["Solo la inflacion argentina", "Accion afuera y dolar financiero", "La tasa de plazo fijo"],
      answerIndex: 1,
      explanation: "Bien. Un CEDEAR combina mercado externo y tipo de cambio financiero.",
    },
  },
  {
    id: "fci",
    title: "FCI Mercado de Dinero: mejor que la caja de ahorro",
    subtitle: "Tu plata genera interés diario y la rescatás en 24 horas.",
    level: "inicial",
    tags: ["Ahorro", "Liquidez", "Rendimiento"],
    recommendedFor: ["conservador", "moderado"],
    sections: [
      {
        title: "Qué es un FCI",
        body: "Un Fondo Común de Inversión (FCI) es un pool de inversores que le encarga a un gestor profesional invertir en conjunto. El de Mercado de Dinero invierte en instrumentos seguros de muy corto plazo: LECAPs, plazos fijos bancarios, cheques de pago diferido. No tenés que hacer nada vos.",
      },
      {
        title: "Por qué es mejor que la caja de ahorro",
        body: "La caja de ahorro paga entre 0 y 15% anual. Un FCI de Mercado de Dinero paga entre 40 y 70% anual, acreditando los intereses todos los días hábiles. En Mercado Pago, Naranja X o cualquier broker accedés en segundos. El rescate llega a tu cuenta en 24 horas hábiles.",
      },
      {
        title: "El riesgo real",
        body: "Es muy bajo, pero no nulo. En crisis extremas puede haber días de tasa negativa. Para el colchón de emergencias o dinero de corto plazo, es siempre mejor que tenerlo parado en cuenta corriente. Para plazos más largos, MEP o CEDEARs pueden rendir más.",
      },
    ],
    example: (state) => {
      const liquid = state.wallets.reduce((s, w) => s + w.balance, 0)
        + state.accounts.reduce((s, a) => s + a.balance, 0);
      if (liquid > 0) {
        const rendimiento = Math.round(liquid * 0.055);
        return `Con tus $${liquid.toLocaleString("es-AR")} en cuentas, en un FCI MM ganarías aproximadamente $${rendimiento.toLocaleString("es-AR")} por mes (5.5% mensual aprox). Parado en cuenta corriente: $0.`;
      }
      return "Ejemplo: $200.000 en caja de ahorro → $0 por mes. En FCI MM → $11.000 por mes. En un año, la diferencia es $130.000.";
    },
    quiz: {
      question: "¿En cuánto tiempo rescatás el dinero de un FCI de Mercado de Dinero?",
      options: ["Al instante, igual que una caja de ahorro", "En 24 horas hábiles", "En 30 días como un plazo fijo"],
      answerIndex: 1,
      explanation: "Exacto. El rescate del FCI MM tarda 24 horas hábiles — casi inmediato y con rendimiento diario.",
    },
  },
  {
    id: "cuotas-math",
    title: "La matemática real de las cuotas",
    subtitle: "Cuándo conviene pagar en cuotas y cuándo el descuento contado gana.",
    level: "inicial",
    tags: ["Deuda", "Consumo", "Calculo"],
    recommendedFor: ["conservador", "moderado", "agresivo"],
    sections: [
      {
        title: "Cuotas en inflación alta",
        body: "En Argentina, 12 cuotas 'sin interés' son una ventaja real cuando la inflación es alta. Pagás las últimas cuotas con pesos que valen mucho menos. Una cuota de $10.000 en el mes 12 con 4% mensual de inflación equivale a $6.200 del mes 1. Es como pagar a descuento.",
      },
      {
        title: "El descuento contado",
        body: "Algunas tiendas ofrecen 10-15% de descuento por pago en efectivo. La pregunta clave: ¿ese descuento supera lo que ganarías invirtiendo ese dinero mes a mes mientras pagás cuotas? Si la tasa de inflación mensual × número de cuotas supera el descuento, las cuotas ganan.",
      },
      {
        title: "El CFT que nadie te muestra",
        body: "El Costo Financiero Total (CFT) incluye todo: intereses, seguros, comisiones y el IVA de esos intereses. Un crédito que parece al 40% TNA puede tener CFT del 80%. Antes de firmar, pedí el CFT en papel. Por ley el banco debe informarlo. Si el CFT supera la inflación esperada, pagá contado.",
      },
    ],
    example: () =>
      "Ejemplo: TV $200.000 contado o 12 cuotas de $18.000 (CFT 30%). Con inflación 4% mensual, el valor real de todas las cuotas sumadas es $168.000 — pagás menos que el precio de etiqueta, porque el dinero se licúa.",
    quiz: {
      question: "Con inflación del 4% mensual, ¿qué conviene para comprar un lavarropas de $180.000?",
      options: [
        "Pagar $180.000 contado hoy",
        "12 cuotas de $15.000 sin interés — el valor real baja",
        "No comprarlo hasta bajar la inflación",
      ],
      answerIndex: 1,
      explanation: "Correcto. Con 4% mensual las últimas cuotas valen casi la mitad en términos reales. Las cuotas sin interés en inflación alta son una ventaja.",
    },
  },
  {
    id: "freelance-dolar",
    title: "Cobrar en dólares siendo argentino",
    subtitle: "La ventaja del talento argentino: cobrás global, gastás local.",
    level: "medio",
    tags: ["Dolares", "Trabajo", "AFIP"],
    recommendedFor: ["moderado", "agresivo"],
    sections: [
      {
        title: "La ventaja competitiva",
        body: "Un desarrollador, diseñador o marketer argentino puede cobrar tarifas internacionales en USD y gastar sus pesos con costos locales. El tipo de cambio crea una ventaja estructural que puede triplicar o cuadriplicar el poder adquisitivo respecto a un trabajo en pesos.",
      },
      {
        title: "Cómo cobrar y convertir",
        body: "Wise y Payoneer reciben transferencias internacionales con comisiones bajas. Crypto (USDT/USDC) es otra opción. Al convertir a pesos, el MEP es 100% legal, transparente y mejor que el tipo oficial. El blue da más pesos pero implica riesgo legal y dificultad para justificar el origen.",
      },
      {
        title: "AFIP y la declaración correcta",
        body: "La exportación de servicios digitales tiene beneficios impositivos en Argentina. Como monotributista podés facturar al exterior. Los ingresos en USD deben declararse. No declarar puede derivar en intimaciones de AFIP, cierre de cuentas bancarias y multas que superan el ahorro fiscal.",
      },
    ],
    example: (state) => {
      const salary = state.user?.salary ?? 0;
      if (salary > 0) {
        const usd = Math.round(salary / 1200);
        return `Tu sueldo de $${salary.toLocaleString("es-AR")} equivale a USD $${usd} al cambio MEP. Un freelancer que cobra USD $${usd + 500} al mes tiene un 40% más de poder adquisitivo real sin cambiar de rubro.`;
      }
      return "Ejemplo: USD $1.500/mes al MEP de $1.200 = $1.800.000 pesos. El mismo trabajo en dependencia típicamente pagaría $700.000-$900.000.";
    },
    quiz: {
      question: "¿Qué tipo de cambio es 100% legal para convertir dólares del exterior?",
      options: ["Dólar blue — el que más pesos da", "MEP o CCL — cambio financiero legal", "Dólar oficial — el del banco"],
      answerIndex: 1,
      explanation: "El MEP (y el CCL) son 100% legales. Se operan a través de brokers regulados comprando y vendiendo bonos. Es la forma más conveniente y segura.",
    },
  },
];

export function completeLesson(state: AppState, lessonId: string): AppState {
  if (state.tycoon.completedLessonIds.includes(lessonId)) return state;
  const triggered = getTriggeredEventsForLesson(lessonId);
  // Solo encola los que no están ya en cola ni ya jugados
  const played = new Set(state.tycoon.eventHistory.map((h) => h.eventId));
  const toAdd = triggered.filter(
    (id) => !played.has(id) && !state.tycoon.triggeredEventIds.includes(id),
  );
  return {
    ...state,
    tycoon: {
      ...state.tycoon,
      mangoCash: state.tycoon.mangoCash + lessonReward,
      completedLessonIds: [...state.tycoon.completedLessonIds, lessonId],
      triggeredEventIds: [...state.tycoon.triggeredEventIds, ...toAdd],
    },
  };
}
