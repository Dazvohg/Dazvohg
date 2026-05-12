export interface LessonStep {
  title: string
  content: string
  tip?: string
}

export interface Lesson {
  id: string
  title: string
  description: string
  icon: string
  category: 'presupuesto' | 'deuda' | 'ahorro' | 'inversión' | 'mercados'
  difficulty: 'básico' | 'intermedio' | 'avanzado'
  estimatedMinutes: number
  mcReward: number
  steps: LessonStep[]
}

export const LESSON_MC_REWARD = 650

export const LESSONS: Lesson[] = [
  {
    id: 'presupuesto',
    title: 'Tu primer presupuesto',
    description: 'Organizá ingresos y gastos con el método 50/30/20.',
    icon: '📊',
    category: 'presupuesto',
    difficulty: 'básico',
    estimatedMinutes: 8,
    mcReward: LESSON_MC_REWARD,
    steps: [
      {
        title: '¿Qué es un presupuesto?',
        content: 'Un presupuesto es un plan de cómo vas a usar tu plata cada mes. Sin uno, el dinero "desaparece". En Mango Tycoon, tu saldo de MC es tu presupuesto virtual.',
        tip: 'El 70% de los argentinos no lleva un presupuesto mensual.',
      },
      {
        title: 'La regla 50/30/20',
        content: '50% para necesidades (activos estables como bonos), 30% para gustos (clubes, turismo), 20% para ahorro (cash de emergencia). Aplicala a tu portfolio de MC.',
      },
      {
        title: 'Categorizá tus gastos',
        content: 'En el juego tenés 7 tipos de activos. Revisá tu Portfolio y analizá qué porcentaje tenés en cada categoría. ¿Estás demasiado concentrado en un solo sector?',
      },
      {
        title: 'Ajustá y repetí',
        content: 'Un buen portfolio, como un buen presupuesto, se revisa frecuentemente. Entrá al juego cada día, cobrá tus rentas y redistribuí según los eventos económicos.',
        tip: '¡Volvé cada día para cobrar tu renta pasiva!',
      },
    ],
  },
  {
    id: 'deuda-cara',
    title: 'Entendé la deuda cara',
    description: 'Por qué los bonos tienen tasas y cómo usarlos a tu favor.',
    icon: '💳',
    category: 'deuda',
    difficulty: 'básico',
    estimatedMinutes: 10,
    mcReward: LESSON_MC_REWARD,
    steps: [
      {
        title: '¿Qué es una tasa de interés?',
        content: 'Cuando comprás un bono en el juego (como AL30 o LECAP), esa entidad te paga un porcentaje por prestarte tu MC. En la realidad es igual: los bonos son "deuda del gobierno o empresa" que te pagan interés.',
        tip: 'Los bonos en el juego pagan renta diaria. En la realidad pagan cada 6 meses.',
      },
      {
        title: 'Deuda buena vs deuda mala',
        content: 'Deuda buena: tasas menores a la inflación, para generar activos. Deuda mala: tarjetas y adelantos con tasas del 150-250% anual. En Argentina, la inflación del juego erosiona el valor del cash sin invertir.',
      },
      {
        title: 'Avalancha vs bola de nieve',
        content: 'Avalancha: atacá primero las deudas más caras (mayor tasa). Bola de nieve: liquidá las más chicas para ganar motivación. En el juego: vendé primero los activos que perdieron más valor para reliberar MC.',
      },
      {
        title: 'El riesgo país en el juego',
        content: 'Los eventos "Turbulencia Financiera" bajan el yield de los bonos. En la realidad, cuando el riesgo país sube, el Estado paga más interés para que le presten. Seguí el EconomyTicker del juego.',
      },
    ],
  },
  {
    id: 'colchon',
    title: 'Tu colchón de emergencias',
    description: 'Por qué guardar cash aunque rinda menos en el juego.',
    icon: '🛡️',
    category: 'ahorro',
    difficulty: 'básico',
    estimatedMinutes: 7,
    mcReward: LESSON_MC_REWARD,
    steps: [
      {
        title: '¿Para qué sirve?',
        content: 'En el juego, si se activa un evento de crisis y querés comprar un activo "de remate", necesitás MC disponible. Sin colchón, perdés las mejores oportunidades. En la vida real es igual.',
      },
      {
        title: '¿Cuánto guardar?',
        content: 'Regla del juego: mantené al menos 15-20% de tu patrimonio en cash (MC). Así podés aprovechar cualquier evento económico positivo sin vender activos a pérdida.',
      },
      {
        title: 'El problema de la inflación virtual',
        content: 'En el juego, el MC sin invertir se deprecia con la inflación simulada. Por eso el colchón no debe ser grande. Lo suficiente para oportunidades, no tanto que se devalúe.',
        tip: 'En la realidad: FCI Money Market o cuenta remunerada para el colchón.',
      },
      {
        title: 'Construilo gradualmente',
        content: 'Empezá con 10% de cada renta cobrada como reserva. Cuando llegues a 2-3 pagos de tus activos más caros, tu colchón está listo.',
      },
    ],
  },
  {
    id: 'dolar-ahorro',
    title: 'El dólar y la brecha cambiaria',
    description: 'Cómo el dólar blue afecta los precios del juego y la economía real.',
    icon: '💵',
    category: 'ahorro',
    difficulty: 'intermedio',
    estimatedMinutes: 12,
    mcReward: LESSON_MC_REWARD,
    steps: [
      {
        title: 'El dólar en el juego',
        content: 'El EconomyTicker muestra el dólar blue real traído de la API de Argentina. Cuando sube, los activos de empresas exportadoras y energía suben también. Cuando baja por un acuerdo del FMI, los bonos explotan.',
      },
      {
        title: 'La brecha cambiaria',
        content: 'Brecha = diferencia entre dólar oficial y blue. Alta brecha = dólar blue caro = conviene tener activos dolarizados (bonos hard dollar, CEDEARs). En el juego, los eventos "Cepo" suben la brecha artificialmente.',
      },
      {
        title: 'Estrategia con eventos',
        content: 'Cuando aparece "Boom FMI": comprá bonos antes de que suban. Cuando aparece "Cepo": comprá activos exportadores. Anticipate a los eventos leyendo el EconomyTicker.',
        tip: 'En la realidad: el dólar MEP es la forma legal de dolarizarse desde $0.',
      },
      {
        title: 'Diversificación cambiaria',
        content: 'No pongas todo en activos pesos ni todo en activos dolar. La regla clásica del inversor argentino: 50% pesos inflación (acciones, inmuebles), 50% dólares (bonos hard, reserva).',
      },
    ],
  },
  {
    id: 'merval-basico',
    title: 'El MERVAL: acciones argentinas',
    description: 'Cómo funcionan las empresas del juego y la bolsa real.',
    icon: '📈',
    category: 'mercados',
    difficulty: 'intermedio',
    estimatedMinutes: 15,
    mcReward: LESSON_MC_REWARD,
    steps: [
      {
        title: '¿Qué es una acción?',
        content: 'En el juego, los activos de tipo "Empresa" representan acciones. Comprás una parte de Tecno Corp, EnergySur o cualquier empresa del juego. En la realidad: YPF, GGAL, BMA en la Bolsa de Buenos Aires.',
      },
      {
        title: 'Cómo sube el precio',
        content: 'En el juego: los eventos positivos como "Boom Vaca Muerta" suben las empresas de energía. En la realidad: ganancias del trimestre, contratos nuevos, subas del MERVAL por entorno macro positivo.',
      },
      {
        title: 'Reputación = acceso premium',
        content: 'En el juego, comprando empresas ganás reputación financiera. Con más reputación desbloqueás empresas más rentables. En la realidad, los brokers te permiten operar CEDEARs y derivados con más experiencia.',
        tip: 'Comprá 3-4 empresas distintas para ganar reputación financiera rápido.',
      },
      {
        title: 'Largo plazo',
        content: 'Las empresas del juego tienen volatilidad mayor que los bonos. Pero en el largo plazo dan más rendimiento. En la realidad: el MERVAL en dólares subió 400%+ en 5 años. La paciencia se recompensa.',
      },
    ],
  },
  {
    id: 'cedears',
    title: 'CEDEARs y activos globales',
    description: 'Cómo los activos internacionales te protegen de la devaluación.',
    icon: '🌎',
    category: 'mercados',
    difficulty: 'intermedio',
    estimatedMinutes: 12,
    mcReward: LESSON_MC_REWARD,
    steps: [
      {
        title: 'Los activos globales del juego',
        content: 'En Mango Tycoon los bonos en dólares (AL30, GD35, ON YPF) representan activos hard dollar: su precio sigue al dólar. En la realidad, los CEDEARs hacen lo mismo: comprás Apple en pesos.',
      },
      {
        title: 'Cobertura automática',
        content: 'Cuando el dólar sube en el juego (evento "Cepo" o "Dólar Blue en Alza"), los bonos hard dollar suben en MC. Así te cubrís de la devaluación virtual. En la realidad los CEDEARs hacen lo mismo.',
      },
      {
        title: 'El ratio de conversión',
        content: 'Cada CEDEAR real equivale a X fracciones de la acción original. Si el dólar CCL baja (brecha se achica), los CEDEARs bajan en pesos aunque la acción suba en dólares. En el juego: los eventos FMI pueden bajar los bonos hard dollar.',
        tip: 'SPY, QQQ, AAPL son los CEDEARs más negociados en Argentina.',
      },
      {
        title: 'Diversificación global',
        content: 'No todo es Argentina. En el juego tenés activos que representan economías distintas. En la realidad: CEDEARs de distintos países y sectores te protegen del riesgo argentino puro.',
      },
    ],
  },
]
