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
  xpReward: number
  steps: LessonStep[]
}

export const lessonReward = 650

export const lessons: Lesson[] = [
  {
    id: 'presupuesto',
    title: 'Tu primer presupuesto',
    description: 'Organizá ingresos y gastos con el método 50/30/20.',
    icon: '📊',
    category: 'presupuesto',
    difficulty: 'básico',
    estimatedMinutes: 8,
    xpReward: lessonReward,
    steps: [
      {
        title: '¿Qué es un presupuesto?',
        content:
          'Un presupuesto es un plan de cómo vas a usar tu plata cada mes. Sin uno, el dinero "desaparece" sin que sepas a dónde fue. Es la base de cualquier plan financiero.',
        tip: 'El 70% de los argentinos no lleva un presupuesto mensual.',
      },
      {
        title: 'La regla 50/30/20',
        content:
          '50% para necesidades (alquiler, comida, servicios), 30% para gustos (salidas, ropa, hobbies) y 20% para ahorro e inversión. En Argentina ajustá el 20% según la inflación del mes.',
      },
      {
        title: 'Categorizá tus gastos',
        content:
          'Anotá todos tus gastos del mes pasado en categorías. Verás claramente dónde se va tu plata. Usá la sección Finanzas de Mango para hacerlo automáticamente.',
      },
      {
        title: 'Ajustá y repetí',
        content:
          'El primer presupuesto nunca es perfecto. Revisalo cada semana, ajustá las categorías y en 3 meses tendrás control total.',
        tip: 'Reservá 15 minutos los domingos para revisar tus gastos de la semana.',
      },
    ],
  },
  {
    id: 'deuda-cara',
    title: 'Acabá con las deudas caras',
    description: 'Las tarjetas y créditos te comen el sueldo. Aprendé a librarte de ellas.',
    icon: '💳',
    category: 'deuda',
    difficulty: 'básico',
    estimatedMinutes: 10,
    xpReward: lessonReward,
    steps: [
      {
        title: '¿Qué es una deuda cara?',
        content:
          'Cualquier deuda con tasa mayor a la inflación mensual. En Argentina: tarjetas de crédito, adelantos de sueldo y préstamos de fintech. Pagan 120-250% anual.',
      },
      {
        title: 'El método avalancha',
        content:
          'Listá todas tus deudas de mayor a menor tasa. Pagá mínimos en todas y volcá todo el extra a la más cara. Ahorrás la mayor cantidad de intereses posible.',
        tip: 'Una deuda al 200% TNA se duplica en 6 meses si no la atacás.',
      },
      {
        title: 'El método bola de nieve',
        content:
          'Alternativa psicológica: ordená por monto de menor a mayor. Liquidá la más chica primero para ganar momentum y motivación, luego seguí con la siguiente.',
      },
      {
        title: 'Negociá tu deuda',
        content:
          'Muchos bancos ofrecen refinanciación si los llamás. Podés conseguir planes en cuotas con tasas más bajas. Siempre preguntá antes de aceptar la tasa llena.',
        tip: 'El BCRA tiene programas de refinanciación. Consultá antes de resignarte.',
      },
    ],
  },
  {
    id: 'colchon',
    title: 'Armá tu colchón de emergencias',
    description: 'Tu escudo contra lo impredecible. Construilo en pesos sin que la inflación te lo coma.',
    icon: '🛡️',
    category: 'ahorro',
    difficulty: 'básico',
    estimatedMinutes: 7,
    xpReward: lessonReward,
    steps: [
      {
        title: '¿Para qué sirve?',
        content:
          'Cubre gastos inesperados (médicos, reparaciones, quedarse sin trabajo) sin endeudarte. Es la base de cualquier plan financiero serio.',
      },
      {
        title: '¿Cuánto necesitás?',
        content:
          'El objetivo es 3 a 6 meses de gastos esenciales. Si tus gastos fijos son $500.000/mes, tu colchón ideal va de $1.500.000 a $3.000.000.',
      },
      {
        title: 'Cómo no perderlo con la inflación',
        content:
          'No lo guardes en efectivo. Usá una cuenta remunerada (~70% TNA), Money Market FCI (liquidez el mismo día hábil) o LECAP si el plazo lo permite.',
        tip: 'Los FCI Money Market se rescatan el mismo día hábil sin comisiones.',
      },
      {
        title: 'Construilo gradualmente',
        content:
          'Empezá con 1 mes como meta. Destiná el 10% de cada sueldo. Automatizalo el día de cobro para que no se "gaste solo".',
      },
    ],
  },
  {
    id: 'dolar-ahorro',
    title: 'El dólar: reserva de valor',
    description: 'En Argentina el dólar no es especulación, es protección. Aprendé a usarlo.',
    icon: '💵',
    category: 'ahorro',
    difficulty: 'intermedio',
    estimatedMinutes: 12,
    xpReward: lessonReward,
    steps: [
      {
        title: 'El problema de la inflación',
        content:
          'Con inflación del 100%+ anual, los pesos que ahorrás hoy valen la mitad el año que viene. El dólar es la cobertura histórica de los argentinos.',
      },
      {
        title: 'Tipos de dólar',
        content:
          'Oficial (BCRA), MEP/Bolsa (legal, sin límite), CCL/Cable (para transferir al exterior), Blue (informal). Cada uno tiene sus reglas de acceso.',
      },
      {
        title: 'Dólar MEP: la forma legal',
        content:
          'Comprás un bono en pesos (ej. AL30) y lo vendés en dólares dentro del mismo mercado. Sin límite mensual, legal, sin impuestos adicionales.',
        tip: 'Necesitás una cuenta comitente en cualquier broker regulado por CNV.',
      },
      {
        title: '¿Qué porcentaje en dólares?',
        content:
          'Regla común: 30-50% de los ahorros en dólares como reserva, el resto en instrumentos con cobertura inflacionaria (CER, plazos fijos UVA, acciones MERVAL).',
      },
    ],
  },
  {
    id: 'merval-basico',
    title: 'El MERVAL para principiantes',
    description: 'La bolsa argentina no es solo para ricos. Conceptos básicos para empezar.',
    icon: '📈',
    category: 'mercados',
    difficulty: 'intermedio',
    estimatedMinutes: 15,
    xpReward: lessonReward,
    steps: [
      {
        title: '¿Qué es una acción?',
        content:
          'Una acción es una parte pequeña de una empresa. Si comprás 100 acciones de una empresa, sos propietario de una fracción de ella. Si la empresa crece, tu acción vale más.',
      },
      {
        title: 'El índice MERVAL',
        content:
          'Agrupa las 20 empresas más grandes de la Bolsa de Buenos Aires. Es el termómetro de la economía argentina: cuando sube, hay optimismo; cuando baja, hay miedo.',
      },
      {
        title: 'Cómo empezar',
        content:
          'Abrí una cuenta comitente en un broker (PPI, InvertirOnline, Bull Market, etc.). Es gratis, se hace desde el celular y podés empezar con muy poco capital.',
      },
      {
        title: 'Diversificá, no apostés',
        content:
          'Comprá 5-6 empresas de distintos sectores (energía, bancos, agronegocios, utilities). Invertí solo dinero que no necesitás a corto plazo. Las acciones son para 1-5 años.',
        tip: 'El MERVAL en dólares CCL subió más de 400% en los últimos 5 años.',
      },
    ],
  },
  {
    id: 'cedears',
    title: 'CEDEARs: el mundo desde Argentina',
    description: 'Invertí en Apple, Tesla, el S&P500 desde tu cuenta en pesos.',
    icon: '🌎',
    category: 'mercados',
    difficulty: 'intermedio',
    estimatedMinutes: 12,
    xpReward: lessonReward,
    steps: [
      {
        title: '¿Qué son?',
        content:
          'CEDEARs (Certificados de Depósito Argentinos) son acciones extranjeras que cotizan en el mercado argentino. Comprás en pesos y el precio sigue al dólar CCL automáticamente.',
      },
      {
        title: 'Ventajas clave',
        content:
          'Sin necesitar dólares, invertís en Apple, Microsoft, Amazon, ETFs. Te cubrís de devaluaciones automáticamente porque el precio en pesos sube cuando sube el dólar.',
      },
      {
        title: 'Los más populares',
        content:
          'SPY (S&P 500), QQQ (Nasdaq), AAPL, MSFT, GOOGL, AMZN, TSLA, MELI. También hay ETFs sectoriales: XLF (bancos), XLE (energía), GLD (oro).',
      },
      {
        title: 'El ratio de conversión',
        content:
          'Cada CEDEAR equivale a una fracción de la acción original (el CR). Si el dólar CCL baja, los CEDEARs bajan en pesos aunque la acción suba en Wall Street. Entendé esto antes de operar.',
      },
    ],
  },
]
