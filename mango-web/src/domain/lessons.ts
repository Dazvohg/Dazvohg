import { budgetHealth, money, totalDebt, totalLiquid } from "./finance";
import type { AppState } from "./types";

export type Lesson = {
  id: string;
  title: string;
  subtitle: string;
  level: "inicial" | "medio";
  tags: string[];
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
    sections: [
      {
        title: "La comparacion correcta",
        body: "Si una inversion te rinde 30% anual, parece mucho. Pero si tu tarjeta te cobra 90% anual por refinanciar, cada peso que pagas ahi evita un costo mucho mayor.",
      },
      {
        title: "El minimo es tiempo caro",
        body: "Pagar el minimo evita el problema hoy, pero compra tiempo a una tasa altisima. Por eso Mango insiste en pagar mas que el minimo cuando sea posible.",
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
      return `Hoy tenes ${money(liquid)} liquidos cargados. Mango puede ayudarte a separar que parte es colchon y que parte se puede invertir o usar para deuda.`;
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
];

export function completeLesson(state: AppState, lessonId: string): AppState {
  if (state.tycoon.completedLessonIds.includes(lessonId)) return state;
  return {
    ...state,
    tycoon: {
      ...state.tycoon,
      mangoCash: state.tycoon.mangoCash + lessonReward,
      completedLessonIds: [...state.tycoon.completedLessonIds, lessonId],
    },
  };
}
