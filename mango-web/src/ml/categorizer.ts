/**
 * categorizer.ts
 *
 * Naive Bayes text classifier for Argentine Spanish expense descriptions.
 * Pre-computed corpus — no training loop required.
 * Pure math, zero external dependencies.
 */

import type { ExpenseCategory } from "../domain/types";

// ─── Public types ──────────────────────────────────────────────────────────────

export type ClassificationResult = {
  category: ExpenseCategory;
  confidence: number; // 0–1, derived from softmax over log-likelihoods
  alternatives: Array<{ category: ExpenseCategory; confidence: number }>;
};

// ─── Corpus ───────────────────────────────────────────────────────────────────
//
// Each category lists words (tokens after normalization) that are strongly
// associated with it. Words may repeat across categories — the Naive Bayes
// likelihood still discriminates correctly through joint log-probabilities.
//
// Argentine brands, slang, and common payment descriptions are included
// so that real bank/card statement strings are classified well out of the box.

const CORPUS: Record<ExpenseCategory, readonly string[]> = {
  // ── Supermercado / almacén ─────────────────────────────────────────────────
  super: [
    // Cadenas grandes
    "carrefour", "coto", "disco", "jumbo", "walmart", "dia", "vea",
    "changomas", "makro", "mayorista", "maxiconsumo", "vital", "toledo",
    "super", "supermercado", "hipermercado", "almacen", "verduleria",
    "fruteria", "panaderia", "carniceria", "fiambreria", "rotiseria",
    // Productos típicos
    "leche", "pan", "carne", "pollo", "verdura", "fruta", "aceite",
    "harina", "arroz", "fideos", "yerba", "mate", "azucar", "sal",
    "manteca", "queso", "jamon", "huevos", "tomate", "cebolla",
    "papas", "lechuga", "manzana", "banana", "naranja",
    // Términos de compra
    "compra", "mercado", "fiado", "ticket", "factura", "kilo", "gramo",
    "litro", "docena", "pack", "oferta", "descuento", "mayoreo",
    "precio", "caja", "bolsa", "changuito", "gondola",
    // Bebidas
    "gaseosa", "cerveza", "vino", "agua", "jugo", "soda", "whisky",
    // Tiendas de conveniencia
    "kiosko", "kiosco", "minimercado", "colmado",
  ],

  // ── Delivery / comida a domicilio ──────────────────────────────────────────
  delivery: [
    // Plataformas
    "rappi", "pedidosya", "pya", "glovo", "ubereats", "ifood",
    // Restaurantes y tipos
    "delivery", "restaurante", "restaurant", "hamburgueseria", "pizzeria",
    "sushi", "chinese", "chino", "arabe", "tailandes", "thai", "indio",
    "cafe", "cafeteria", "bar", "parrilla", "asado", "milanesa",
    "empanada", "medialunas", "facturas", "tostado", "sandwich",
    "hamburguesa", "pizza", "sushi", "bife", "lomo", "bondiola",
    "choripan", "lomito", "shawarma", "falafel", "ramen", "poke",
    // Términos de servicio
    "pedido", "envio", "domicilio", "local", "take", "away", "takeaway",
    "propina", "cargo", "costo", "envio", "tarifa", "servicio",
    "men", "menu", "carta",
    // Comidas rápidas / franquicias
    "mcdonalds", "burgerkingargs", "burgerking", "wendys", "mostaza",
    "subway", "kfc", "popeyes", "fridays", "tgifridays", "applebees",
    "lasquelas", "latavernita", "kentucky", "freddo", "la", "segunda",
    "helados", "heladeria", "gelato", "postre", "torta",
  ],

  // ── Transporte ─────────────────────────────────────────────────────────────
  transporte: [
    // Aplicaciones y servicios
    "uber", "cabify", "didi", "beat", "taxi", "remis", "radiotaxi",
    "sube", "colectivo", "subte", "metro", "tren", "metrobus",
    // Combustible
    "nafta", "gasoil", "diesel", "gnc", "combustible", "estacion",
    "shell", "ypf", "axion", "petrobras", "puma", "eg3",
    // Vehículo y mantenimiento
    "peaje", "autopista", "ruta", "tasa", "vialidad", "aurpass",
    "telepass", "au7", "panamericana", "acceso", "oeste", "sur",
    "norte", "este",
    // Aereo y larga distancia
    "aerolineas", "flybondi", "jetsmart", "latam", "aerolíneas",
    "vuelo", "aeropuerto", "bus", "flecha", "chevalier", "plusmar",
    "andesmar", "via", "bariloche", "expreso", "rapido",
    // Parking y otros
    "parking", "estacionamiento", "garage", "cochera", "valet",
    "bicicleta", "ecobici", "moto", "patinete",
    // Genérico
    "pasaje", "boleto", "ticket", "viaje", "flete", "mudanza",
  ],

  // ── Servicios públicos y suscripciones ────────────────────────────────────
  servicios: [
    // Electricidad
    "edenor", "edesur", "edelap", "epec", "epee", "epen", "luz",
    "electricidad", "energia",
    // Agua y gas
    "aysa", "absa", "osmiba", "agua", "metrogas", "gasnea", "naturgy",
    "camuzzi", "gas", "litoral",
    // Telecomunicaciones
    "telecom", "personal", "claro", "movistar", "fibertel", "cablevision",
    "flow", "directv", "arnet", "speedy", "starlink", "wifi", "internet",
    "movil", "celular", "telefono", "linea",
    // Streaming
    "netflix", "disney", "spotify", "hbo", "max", "amazon", "prime",
    "paramount", "apple", "youtube", "twitch", "deezer", "tidal",
    "crunchyroll", "mubi",
    // Expensas y hogar
    "expensas", "alquiler", "hipoteca", "consorcio", "administracion",
    "inmobiliaria", "propietario", "inquilino",
    // Otros servicios
    "seguro", "poliza", "cobertura", "abt", "mapfre", "sura", "zurich",
    "smg", "galicia", "hsbc", "santander",
    "municipal", "patente", "ate", "monotributo", "afip", "impuesto",
    "tasa", "ingresos", "brutos", "iva",
  ],

  // ── Salud ──────────────────────────────────────────────────────────────────
  salud: [
    // Obras sociales y prepagas
    "osde", "swiss", "medicus", "sancor", "galeno", "accord",
    "omint", "medife", "osam", "osecac", "ospedyc",
    "prepaga", "obra", "social", "mutual", "cobertura",
    // Farmacias
    "farmacity", "farmacia", "vantage", "del", "ahorro", "drogueria",
    "andreani", "farmacenter", "arroyo",
    // Medicamentos y salud
    "farmaco", "medicamento", "remedio", "pastilla", "comprimido",
    "jarabe", "vacuna", "inyeccion", "crema", "pomada", "vitamina",
    "suplemento", "proteina",
    // Profesionales y centros
    "medico", "doctor", "clinica", "hospital", "sanatorio", "consulta",
    "turno", "guardia", "urgencia", "emergencia", "internacion",
    "cirugia", "laboratorio", "analisis", "estudio", "ecografia",
    "radiografia", "rx", "resonancia", "tomografia",
    // Especialidades
    "dentista", "odontologo", "oculista", "oftalmologo", "psicologo",
    "psiquiatra", "nutricionista", "kinesiologo", "fisioterapeuta",
    "traumatologo", "cardiologo", "dermatologo", "ginecologo",
    // Óptica y otros
    "optica", "lentes", "anteojos", "audifono",
  ],

  // ── Ocio / entretenimiento ─────────────────────────────────────────────────
  ocio: [
    // Cine y teatro
    "cine", "cinemark", "hoyts", "showcase", "village", "lorca",
    "teatro", "obra", "funcion", "pelicula", "entrada",
    // Deportes
    "gimnasio", "gym", "sport", "fitness", "crossfit", "pilates",
    "yoga", "natacion", "pileta", "cancha", "tenis", "padel",
    "futbol", "basquet", "voley", "hockey",
    // Salidas nocturnas
    "boliche", "discoteca", "bar", "cerveceria", "pub", "tragos",
    "cocktail", "fernet", "campari", "aperol",
    // Viajes y turismo
    "hotel", "hostel", "airbnb", "booking", "despegar", "almundo",
    "excursion", "tour", "turismo", "playa", "ski", "nevada",
    // Videojuegos y entretenimiento digital
    "steam", "playstation", "xbox", "nintendo", "epic",
    "psn", "ps4", "ps5", "gamepass",
    // Libros y cultura (los de pago/ocio)
    "kindle", "audible", "fnac",
    // Eventos
    "ticket", "ticketek", "passline", "eventbrite", "recital", "show",
    "festival", "concierto", "exposicion", "museo",
    // Apuestas y juegos de azar
    "quiniela", "loto", "prode", "tombola", "casino", "bingo",
    // Mascotas
    "veterinaria", "veterinario", "mascota", "petshop",
  ],

  // ── Ropa / indumentaria ───────────────────────────────────────────────────
  ropa: [
    // Tiendas argentinas
    "zara", "hm", "forever", "pull", "bear", "mango", "bershka",
    "stradivarius", "massimo", "dutti", "uniqlo", "levis", "wrangler",
    "lacoste", "polo", "ralph", "lauren", "tommy", "hilfiger", "calvin",
    "klein", "nike", "adidas", "puma", "reebok", "new", "balance",
    "vans", "converse", "skechers", "fila",
    // Marcas locales
    "ona", "saez", "vitamina", "kosiuko", "mistral", "equus",
    "rapsodia", "ay", "not", "dead", "akiabara", "cache",
    "cardon", "legacy", "montagne", "topper",
    // Calzado
    "ricky", "sarkany", "prune", "mishka", "sibil", "grimoldi",
    "zapato", "zapatilla", "bota", "sandalia", "deportiva",
    // Prendas
    "remera", "pantalon", "jean", "camisa", "buzo", "campera",
    "piloto", "vestido", "pollera", "calza", "medias", "ropa",
    "indumentaria", "prenda", "tela", "textil",
    // Accesorios
    "cartera", "bolso", "mochila", "billetera", "cinturon", "sombrero",
    "gorra", "bufanda", "guante", "reloj", "anteojos", "joya",
    "bijou", "accesorio",
    // Compras online
    "mercadolibre", "tiendamia", "shein", "aliexpress",
  ],

  // ── Educación ─────────────────────────────────────────────────────────────
  educacion: [
    // Universidades y colegios
    "uba", "uca", "utdt", "uade", "uces", "unsam", "unlam", "utn",
    "palermo", "austral", "belgrano", "siglo", "kennedy",
    "colegio", "escuela", "jardin", "inicial", "primaria", "secundaria",
    "universidad", "facultad", "instituto", "bachillerato",
    // Pagos académicos
    "arancel", "cuota", "matricula", "inscripcion", "beca", "cuotas",
    // Idiomas e institutos
    "english", "ingles", "mandarin", "portugues", "frances", "italiano",
    "aiesec", "britisharts", "cultura", "britanica", "alianza",
    // Cursos y plataformas
    "coursera", "udemy", "platzi", "egghead", "pluralsight", "linkedin",
    "learning", "skillshare", "masterclass", "domestika",
    // Material educativo
    "libro", "manual", "cuaderno", "carpeta", "lapiz", "boligrafo",
    "resma", "fotocopia", "impresion", "libreria",
    // Posgrados
    "maestria", "doctorado", "especializacion", "posgrado", "mba",
    "diplomatura", "seminario", "taller", "workshop",
    // Tecnología educativa
    "campus", "aula", "virtual", "zoom", "meet", "teams",
  ],

  // ── Otros ─────────────────────────────────────────────────────────────────
  otros: [
    // Transferencias y movimientos bancarios
    "transferencia", "debin", "pago", "cobro", "deposito", "extraccion",
    "cajero", "atm", "billetera", "mercadopago", "ualá", "uala",
    "brubank", "naranja", "naranjax", "prex", "modo", "getnet",
    // Trámites y gobierno
    "tramite", "dni", "pasaporte", "registro", "renaper", "sello",
    "notaria", "escribania", "apostilla",
    // Donaciones y religiosos
    "donacion", "iglesia", "parroquia", "fundacion", "ong",
    // Hogar y ferretería
    "ferreteria", "pintureria", "materiales", "construccion", "obra",
    "reparacion", "plomero", "electricista", "gasista", "albañil",
    "muebles", "decoracion", "ikea", "easy", "sodimac",
    // Regalos y misceláneos
    "regalo", "souvenir", "libreria", "papeleria", "bazar", "jugueteria",
    "juguete", "muñeca", "juego",
    // Reembolsos / notas de crédito
    "reembolso", "devolucion", "credito", "nota", "ajuste",
    // Efectivo
    "efectivo", "cash", "billete", "moneda", "cambio",
  ],
};

// ─── Tokenizer ────────────────────────────────────────────────────────────────

/**
 * Normalize a single character: strip combining diacritics produced by NFD
 * decomposition so that "á" → "a", "ü" → "u", etc.
 */
function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * Tokenize an expense description into a list of lowercase, accent-stripped
 * alphabetic tokens of length >= 2.
 */
function tokenize(text: string): string[] {
  return stripDiacritics(text.toLowerCase())
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2);
}

// ─── Model (pre-built from corpus) ────────────────────────────────────────────

const CATEGORIES: readonly ExpenseCategory[] = [
  "super",
  "delivery",
  "transporte",
  "servicios",
  "salud",
  "ocio",
  "ropa",
  "educacion",
  "otros",
];

/**
 * For each category, build a word-frequency map and the total token count.
 */
type CategoryStats = {
  freq: Map<string, number>;
  total: number;
};

function buildModel(): Map<ExpenseCategory, CategoryStats> {
  const model = new Map<ExpenseCategory, CategoryStats>();
  for (const cat of CATEGORIES) {
    const words = CORPUS[cat];
    const freq = new Map<string, number>();
    for (const raw of words) {
      // Normalize corpus words the same way we normalize input
      const token = stripDiacritics(raw.toLowerCase());
      freq.set(token, (freq.get(token) ?? 0) + 1);
    }
    model.set(cat, { freq, total: words.length });
  }
  return model;
}

const MODEL = buildModel();

// Build the global vocabulary (union of all corpus tokens)
const VOCABULARY: Set<string> = new Set<string>();
for (const [, stats] of MODEL) {
  for (const word of stats.freq.keys()) {
    VOCABULARY.add(word);
  }
}
const VOCAB_SIZE = VOCABULARY.size;

// Uniform prior: log(1 / |categories|)
const LOG_PRIOR = Math.log(1 / CATEGORIES.length);

// ─── Classification ───────────────────────────────────────────────────────────

/**
 * Compute the log-likelihood of the token sequence for a given category
 * using Laplace (add-1) smoothing.
 *
 *   log P(token | cat) = log( (freq(token, cat) + 1) / (total(cat) + |V|) )
 */
function logLikelihood(tokens: string[], stats: CategoryStats): number {
  const denominator = stats.total + VOCAB_SIZE;
  let ll = 0;
  for (const token of tokens) {
    const count = stats.freq.get(token) ?? 0;
    ll += Math.log((count + 1) / denominator);
  }
  return ll;
}

/**
 * Softmax over an array of log-scores, returns probabilities in [0, 1].
 * Uses the max-subtraction trick for numerical stability.
 */
function softmax(logScores: number[]): number[] {
  const max = Math.max(...logScores);
  const exps = logScores.map((s) => Math.exp(s - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

/**
 * Classify an expense description.
 *
 * Returns `null` when the description is empty (after tokenization).
 * When `confidence < 0.35` the caller should treat the result as uncertain.
 */
export function classify(description: string): ClassificationResult | null {
  const tokens = tokenize(description);
  if (tokens.length === 0) return null;

  // Compute log-posterior = log-prior + log-likelihood for every category
  const logScores: number[] = CATEGORIES.map((cat) => {
    const stats = MODEL.get(cat)!;
    return LOG_PRIOR + logLikelihood(tokens, stats);
  });

  const probs = softmax(logScores);

  // Build sorted (desc) list of { category, confidence }
  const ranked = CATEGORIES.map((cat, i) => ({
    category: cat,
    confidence: probs[i]!,
  })).sort((a, b) => b.confidence - a.confidence);

  const best = ranked[0]!;

  return {
    category: best.category,
    confidence: best.confidence,
    alternatives: ranked.slice(1),
  };
}
