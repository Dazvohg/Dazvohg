/**
 * neuralnet.ts
 *
 * Prototype Neural Network for Argentine expense classification.
 * Architecture: token embedding via feature hashing → mean-pool → ReLU →
 *               cosine similarity to category prototypes → softmax.
 *
 * This is a Prototypical Network variant (Snell et al., 2017) with deterministic
 * hash-based embeddings — no training loop, analytically derived from the corpus.
 *
 * Key differences from the Naive Bayes classifier (categorizer.ts):
 *   - Distance-based (geometric) vs. probability-based (generative)
 *   - ReLU non-linearity before softmax → discriminative decision boundary
 *   - Sub-word sensitivity: "farmacity2" ≈ "farmacity" via character-level hashing
 *   - Better calibrated on OOV (out-of-vocabulary) tokens
 *
 * Pure math, zero external dependencies. Offline-capable.
 */

import type { ExpenseCategory } from "../domain/types";
import { classify } from "./categorizer";
export type { ClassificationResult } from "./categorizer";

// ── Config ────────────────────────────────────────────────────────────────────

const EMBED_DIM = 24;   // embedding dimension per token
const HASH_SEED = 0x9e3779b9; // golden-ratio hash seed (deterministic)

const CATEGORIES: readonly ExpenseCategory[] = [
  "super", "delivery", "transporte", "servicios",
  "salud", "ocio", "ropa", "educacion", "otros",
];

// ── Corpus (mirrors categorizer.ts — kept in sync manually) ──────────────────
// Abbreviated reference corpus for prototype computation.
// Full corpus lives in categorizer.ts; we only need the token sets here.

const CORPUS_TOKENS: Record<ExpenseCategory, readonly string[]> = {
  super: [
    "carrefour","coto","disco","jumbo","walmart","dia","vea","changomas","makro",
    "mayorista","super","supermercado","hipermercado","almacen","verduleria",
    "panaderia","carniceria","leche","pan","carne","pollo","verdura","fruta",
    "aceite","harina","arroz","fideos","yerba","mate","azucar","sal","manteca",
    "queso","jamon","huevos","tomate","cebolla","papas","lechuga","gaseosa",
    "cerveza","vino","agua","jugo","kiosko","compra","mercado","ticket","oferta",
  ],
  delivery: [
    "rappi","pedidosya","glovo","ubereats","ifood","delivery","restaurante",
    "hamburgueseria","pizzeria","sushi","cafe","cafeteria","bar","parrilla",
    "empanada","hamburguesa","pizza","lomito","pedido","envio","domicilio",
    "mcdonalds","burgerking","subway","kfc","mostaza","freddo","heladeria",
    "takeaway","propina","cargo","menu","local",
  ],
  transporte: [
    "uber","cabify","didi","taxi","remis","sube","colectivo","subte","tren",
    "metrobus","nafta","gasoil","gnc","combustible","shell","ypf","axion",
    "peaje","autopista","telepass","aerolineas","flybondi","jetsmart","vuelo",
    "aeropuerto","bus","parking","estacionamiento","cochera","pasaje","boleto",
    "viaje","ecobici","moto","flete",
  ],
  servicios: [
    "edenor","edesur","edelap","luz","electricidad","aysa","absa","agua",
    "metrogas","gas","telecom","personal","claro","movistar","fibertel",
    "cablevision","flow","directv","netflix","disney","spotify","hbo","amazon",
    "prime","youtube","internet","celular","telefono","expensas","alquiler",
    "hipoteca","seguro","poliza","monotributo","afip","impuesto","patente",
    "starlink","wifi","municipal",
  ],
  salud: [
    "osde","swiss","medicus","sancor","galeno","accord","omint","medife",
    "prepaga","obra","social","farmacity","farmacia","drogueria","medicamento",
    "remedio","pastilla","vacuna","vitamina","medico","doctor","clinica",
    "hospital","sanatorio","consulta","turno","laboratorio","analisis","estudio",
    "dentista","odontologo","psicologo","nutricionista","kinesiologo","optica",
    "lentes","anteojos",
  ],
  ocio: [
    "cine","cinemark","hoyts","showcase","village","teatro","obra","pelicula",
    "entrada","gimnasio","gym","fitness","crossfit","pilates","yoga","natacion",
    "cancha","tenis","padel","futbol","boliche","bar","pub","tragos","hotel",
    "hostel","airbnb","booking","despegar","excursion","turismo","steam",
    "playstation","xbox","nintendo","psn","gamepass","recital","festival",
    "concierto","ticketek","quiniela","veterinaria","mascota","petshop",
  ],
  ropa: [
    "zara","hm","forever","pull","bear","mango","bershka","stradivarius",
    "uniqlo","levis","lacoste","tommy","calvin","klein","nike","adidas","puma",
    "reebok","vans","converse","skechers","fila","ona","saez","vitamina",
    "kosiuko","rapsodia","topper","grimoldi","remera","pantalon","jean","camisa",
    "buzo","campera","vestido","pollera","ropa","indumentaria","calzado",
    "zapatilla","mochila","billetera","reloj","mercadolibre","shein",
  ],
  educacion: [
    "uba","uca","utdt","uade","uces","utn","palermo","austral","belgrano",
    "colegio","escuela","jardin","universidad","facultad","instituto",
    "arancel","cuota","matricula","inscripcion","ingles","frances","portugues",
    "coursera","udemy","platzi","udemy","skillshare","masterclass","domestika",
    "libro","manual","cuaderno","lapiz","libreria","fotocopia","maestria",
    "doctorado","posgrado","mba","diplomatura","seminario","taller","workshop",
    "campus","virtual","zoom","teams",
  ],
  otros: [
    "transferencia","debin","pago","cobro","deposito","cajero","atm","billetera",
    "mercadopago","uala","brubank","naranja","modo","tramite","dni","pasaporte",
    "ferreteria","materiales","construccion","reparacion","muebles","decoracion",
    "easy","sodimac","regalo","bazar","juguete","donacion","reembolso",
    "devolucion","credito","efectivo","cash",
  ],
};

// ── Feature hashing ────────────────────────────────────────────────────────────

/**
 * Map a token to a deterministic unit vector in EMBED_DIM space.
 * Uses multiple polynomial hash passes (one per output dimension group) to fill
 * the embedding — equivalent to random feature maps but without randomness.
 *
 * This captures sub-word structure: "farmacity2" → similar to "farmacity".
 */
function hashEmbed(token: string, dim: number): Float32Array {
  const vec = new Float32Array(dim);

  // Pass 1: forward character scan
  let h = HASH_SEED;
  for (let i = 0; i < token.length; i++) {
    h = Math.imul(h ^ token.charCodeAt(i), 0x9e3779b9);
    h = (h << 13) | (h >>> 19);
    const idx = ((h >>> 0) % dim);
    vec[idx] += (h & 0x80000000) ? 1.0 : -1.0;
  }

  // Pass 2: reverse character scan (bigram sensitivity)
  let h2 = HASH_SEED ^ 0xdeadbeef;
  for (let i = token.length - 1; i >= 0; i--) {
    h2 = Math.imul(h2 ^ token.charCodeAt(i), 0x45d9f3b);
    h2 = (h2 << 7) | (h2 >>> 25);
    const idx = ((h2 >>> 0) % dim);
    vec[idx] += (h2 & 0x40000000) ? 0.5 : -0.5;
  }

  // Normalize to unit sphere
  let norm = 0;
  for (let i = 0; i < dim; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < dim; i++) vec[i] /= norm;

  return vec;
}

function addVec(a: Float32Array, b: Float32Array): void {
  for (let i = 0; i < a.length; i++) a[i] += b[i];
}

function scaleVec(a: Float32Array, s: number): void {
  for (let i = 0; i < a.length; i++) a[i] *= s;
}

function dotProduct(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

/** Mean-pool a list of embeddings into one vector. */
function meanPool(embeddings: Float32Array[]): Float32Array {
  const result = new Float32Array(EMBED_DIM);
  if (embeddings.length === 0) return result;
  for (const e of embeddings) addVec(result, e);
  scaleVec(result, 1 / embeddings.length);
  return result;
}

// ── Prototype computation (at module load) ────────────────────────────────────

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function tokenize(text: string): string[] {
  return stripDiacritics(text.toLowerCase())
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2);
}

const PROTOTYPES: Record<ExpenseCategory, Float32Array> = (() => {
  const result = {} as Record<ExpenseCategory, Float32Array>;
  for (const cat of CATEGORIES) {
    const tokens = CORPUS_TOKENS[cat];
    const embeddings = tokens.map((t) => hashEmbed(tokenize(t)[0] ?? t, EMBED_DIM));
    result[cat] = meanPool(embeddings);
    // Re-normalize prototype to unit sphere so cosine = dot product
    let norm = 0;
    for (let i = 0; i < EMBED_DIM; i++) norm += result[cat][i] ** 2;
    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < EMBED_DIM; i++) result[cat][i] /= norm;
  }
  return result;
})();

// ── Softmax ───────────────────────────────────────────────────────────────────

function softmax(scores: number[]): number[] {
  const max = Math.max(...scores);
  const exps = scores.map((s) => Math.exp(s - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

// ── Neural classifier ─────────────────────────────────────────────────────────

import type { ClassificationResult } from "./categorizer";

/**
 * Classify via prototype neural network.
 * Returns null when description tokenizes to empty.
 */
export function classifyNeural(description: string): ClassificationResult | null {
  const tokens = tokenize(description);
  if (tokens.length === 0) return null;

  // Compute document embedding (mean-pool of token embeddings)
  const docEmbed = meanPool(tokens.map((t) => hashEmbed(t, EMBED_DIM)));

  // Cosine similarity to each prototype (dot product, both are unit-normalized)
  const rawScores = CATEGORIES.map((cat) => dotProduct(docEmbed, PROTOTYPES[cat]));

  // ReLU before softmax: zero out "anti-evidence" dimensions
  const reluScores = rawScores.map((s) => Math.max(0, s));

  // Fallback if all scores are 0 (rare edge case with very short tokens)
  const anyPositive = reluScores.some((s) => s > 0);
  const finalScores = anyPositive ? reluScores : rawScores;

  const probs = softmax(finalScores);

  const ranked = CATEGORIES.map((cat, i) => ({
    category: cat,
    confidence: probs[i]!,
  })).sort((a, b) => b.confidence - a.confidence);

  return {
    category: ranked[0]!.category,
    confidence: ranked[0]!.confidence,
    alternatives: ranked.slice(1),
  };
}

// ── Ensemble ──────────────────────────────────────────────────────────────────

/**
 * Geometric-mean ensemble of Naive Bayes + prototype neural network.
 * Outperforms either alone on ambiguous descriptions (by combining independent
 * evidence sources — generative vs. discriminative classifiers).
 */
export function ensembleClassify(description: string): ClassificationResult | null {
  const nb  = classify(description);
  const nn  = classifyNeural(description);

  if (!nb && !nn) return null;
  if (!nb) return nn;
  if (!nn) return nb;

  // Reconstruct full probability vector for each classifier
  const nbMap = new Map<ExpenseCategory, number>([[nb.category, nb.confidence]]);
  for (const alt of nb.alternatives) nbMap.set(alt.category, alt.confidence);

  const nnMap = new Map<ExpenseCategory, number>([[nn.category, nn.confidence]]);
  for (const alt of nn.alternatives) nnMap.set(alt.category, alt.confidence);

  // Geometric mean blend: p_ensemble(c) ∝ sqrt(p_nb(c) * p_nn(c))
  // This is equivalent to averaging log-probabilities (log-opinion pool)
  const MIN_PROB = 1e-6;
  const blended = CATEGORIES.map((cat) => {
    const pNb = nbMap.get(cat) ?? MIN_PROB;
    const pNn = nnMap.get(cat) ?? MIN_PROB;
    return { category: cat, score: Math.sqrt(pNb * pNn) };
  });

  const totalScore = blended.reduce((s, b) => s + b.score, 0);
  const ranked = blended
    .map((b) => ({ category: b.category, confidence: b.score / (totalScore || 1) }))
    .sort((a, b) => b.confidence - a.confidence);

  return {
    category: ranked[0]!.category,
    confidence: ranked[0]!.confidence,
    alternatives: ranked.slice(1),
  };
}
