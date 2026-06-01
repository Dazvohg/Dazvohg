// generate-icons.mjs — genera los íconos PNG de CheMonei sin dependencias externas.
//
//   node scripts/generate-icons.mjs
//
// Produce, en public/icons/:
//   icon-192.png            (PWA / Android any)
//   icon-512.png            (PWA / Android any)
//   icon-512-maskable.png   (Android adaptive, full-bleed con safe zone)
//   icon-180.png            (apple-touch-icon iOS)
//   favicon-32.png          (landing / browser tab)
//
// Marca: moneda verde sobre fondo navy con glifo de moneda ("$" estilizado).
// Implementa un encoder PNG (RGBA, sin compresión) con CRC32 + Adler32 propios.
// Antialiasing por supersampling 3×3.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "icons");
mkdirSync(OUT_DIR, { recursive: true });

// ── Paleta de marca ──────────────────────────────────────────────────────────
const NAVY  = [10, 22, 40];     // #0A1628 — fondo (= theme_color)
const GREEN = [34, 197, 94];    // #22C55E — moneda
const GREEN_DARK = [21, 128, 61]; // #15803D — borde de la moneda

// ── PNG encoder (pure JS) ──────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function adler32(buf) {
  let a = 1, b = 0;
  for (let i = 0; i < buf.length; i++) {
    a = (a + buf[i]) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

function u32(n) {
  return Buffer.from([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]);
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  return Buffer.concat([u32(data.length), body, u32(crc32(body))]);
}

// rawRGBA: Buffer de length w*h*4. Devuelve un Buffer PNG.
function encodePNG(w, h, rawRGBA) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.concat([
    u32(w), u32(h),
    Buffer.from([8, 6, 0, 0, 0]), // bit depth 8, color type 6 (RGBA)
  ]);

  // Filtro None (0) al inicio de cada fila
  const stride = w * 4;
  const filtered = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    filtered[y * (stride + 1)] = 0;
    rawRGBA.copy(filtered, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }

  // zlib con bloques "stored" (sin compresión): header 0x78 0x01 + bloques DEFLATE stored
  const blocks = [];
  blocks.push(Buffer.from([0x78, 0x01]));
  let offset = 0;
  while (offset < filtered.length) {
    const len = Math.min(65535, filtered.length - offset);
    const isLast = offset + len >= filtered.length ? 1 : 0;
    const header = Buffer.alloc(5);
    header[0] = isLast;
    header.writeUInt16LE(len, 1);
    header.writeUInt16LE(~len & 0xffff, 3);
    blocks.push(header, filtered.subarray(offset, offset + len));
    offset += len;
  }
  blocks.push(u32(adler32(filtered)));
  const idatData = Buffer.concat(blocks);

  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idatData),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ── Dibujo del ícono ───────────────────────────────────────────────────────────
// Devuelve [r,g,b,a] (0-255) para un punto continuo (x,y) en [0,size).
// maskable=true → fondo full-bleed (sin esquinas redondeadas) y moneda más chica.
function sampleIcon(x, y, size, maskable) {
  const cx = size / 2, cy = size / 2;

  // ── Fondo ──
  let bg = null; // null = transparente
  if (maskable) {
    bg = NAVY; // full-bleed
  } else {
    // cuadrado con esquinas redondeadas (squircle simple)
    const r = size * 0.22;
    const dx = Math.max(0, Math.abs(x - cx) - (cx - r));
    const dy = Math.max(0, Math.abs(y - cy) - (cy - r));
    const cornerDist = Math.sqrt(dx * dx + dy * dy);
    if (cornerDist <= r) bg = NAVY;
  }
  if (!bg) return [0, 0, 0, 0];

  // ── Moneda (círculo verde con borde) ──
  const coinR = size * (maskable ? 0.30 : 0.34); // safe zone para maskable
  const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);

  let color = bg;
  if (d <= coinR) {
    color = GREEN;
    // borde más oscuro
    if (d > coinR - size * 0.035) color = GREEN_DARK;

    // ── Glifo "C" de CheMonei (anillo navy con apertura a la derecha) ──
    const gd = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2); // dist al centro
    const ro = coinR * 0.64; // radio externo del anillo
    const ri = coinR * 0.40; // radio interno del anillo
    const ang = Math.atan2(y - cy, x - cx); // -π..π (0 = derecha)
    const inRing = gd >= ri && gd <= ro;
    const inGap  = Math.abs(ang) < 0.62; // apertura de la "C" hacia la derecha
    if (inRing && !inGap) color = NAVY;
  }

  return [color[0], color[1], color[2], 255];
}

function renderIcon(size, maskable) {
  const raw = Buffer.alloc(size * size * 4);
  const SS = 3; // supersampling 3×3
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = px + (sx + 0.5) / SS;
          const y = py + (sy + 0.5) / SS;
          const [pr, pg, pb, pa] = sampleIcon(x, y, size, maskable);
          const af = pa / 255;
          r += pr * af; g += pg * af; b += pb * af; a += pa;
        }
      }
      const n = SS * SS;
      const af = a / (255 * n);
      const idx = (py * size + px) * 4;
      // composición premultiplicada → normalizada
      raw[idx]     = af > 0 ? Math.round(r / (af * n)) : 0;
      raw[idx + 1] = af > 0 ? Math.round(g / (af * n)) : 0;
      raw[idx + 2] = af > 0 ? Math.round(b / (af * n)) : 0;
      raw[idx + 3] = Math.round(a / n);
    }
  }
  return encodePNG(size, size, raw);
}

// ── Generación ─────────────────────────────────────────────────────────────────
const targets = [
  ["icon-192.png", 192, false],
  ["icon-512.png", 512, false],
  ["icon-512-maskable.png", 512, true],
  ["icon-180.png", 180, false],
  ["favicon-32.png", 32, false],
];

for (const [name, size, maskable] of targets) {
  const png = renderIcon(size, maskable);
  writeFileSync(join(OUT_DIR, name), png);
  console.log(`✓ ${name} (${size}×${size}, ${(png.length / 1024).toFixed(1)}KB)`);
}
console.log("\nÍconos generados en public/icons/");
