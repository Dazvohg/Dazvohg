// Deno Edge Function — extracts expense data from a receipt image using Claude vision
// POST /functions/v1/ocr-receipt
// Body: { imageBase64: string, mimeType: "image/jpeg" | "image/png" | "image/webp" }
// Returns: { amount: number, description: string, category: string, date: string | null }

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_API_KEY  = Deno.env.get("ANTHROPIC_API_KEY")        ?? "";
const SUPABASE_URL       = Deno.env.get("SUPABASE_URL")             ?? "";
const SUPABASE_SERVICE   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// ~3 MB image limit (base64 is ~4/3 of raw bytes, so 4_000_000 chars ≈ 3 MB)
const MAX_BASE64_LENGTH = 4_000_000;

// ── Types ────────────────────────────────────────────────────────────────────

type AllowedMimeType = "image/jpeg" | "image/png" | "image/webp";

const ALLOWED_MIME_TYPES: Set<string> = new Set<AllowedMimeType>([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

type ExpenseCategory =
  | "super"
  | "delivery"
  | "transporte"
  | "servicios"
  | "salud"
  | "ocio"
  | "ropa"
  | "educacion"
  | "otros";

interface OcrResult {
  amount: number;
  description: string;
  category: ExpenseCategory;
  date: string | null;
}

// ── Claude vision call ────────────────────────────────────────────────────────

async function extractFromReceipt(imageBase64: string, mimeType: AllowedMimeType): Promise<OcrResult> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key":         ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type":      "application/json",
    },
    body: JSON.stringify({
      model:      "claude-sonnet-4-6",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type:       "base64",
                media_type: mimeType,
                data:       imageBase64,
              },
            },
            {
              type: "text",
              text: 'Extraé de este ticket/factura argentino: el monto total pagado en pesos, una descripción corta del comercio/ítem (máximo 40 caracteres), la categoría de gasto más apropiada de esta lista: super, delivery, transporte, servicios, salud, ocio, ropa, educacion, otros. Y la fecha si está visible. Respondé SOLO con JSON válido: {"amount": number, "description": string, "category": string, "date": string | null}. Sin texto adicional.',
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Claude API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const text: string = data?.content?.[0]?.text ?? "";

  // Extract JSON object — guard against markdown fences
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON object found in Claude response");

  const parsed = JSON.parse(jsonMatch[0]) as OcrResult;

  // Basic validation / coercion
  const validCategories = new Set<string>([
    "super", "delivery", "transporte", "servicios",
    "salud", "ocio", "ropa", "educacion", "otros",
  ]);

  const amount = typeof parsed.amount === "number" && isFinite(parsed.amount)
    ? Math.abs(parsed.amount)
    : 0;

  const description = typeof parsed.description === "string"
    ? parsed.description.slice(0, 40)
    : "Sin descripción";

  const category: ExpenseCategory = validCategories.has(parsed.category)
    ? (parsed.category as ExpenseCategory)
    : "otros";

  // Accept ISO date strings only (YYYY-MM-DD); reject anything else
  const dateRaw = parsed.date;
  const date = typeof dateRaw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateRaw)
    ? dateRaw
    : null;

  return { amount, description, category, date };
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

    const body = await req.json() as { imageBase64?: string; mimeType?: string };
    const { imageBase64, mimeType } = body;

    // Validate inputs
    if (!imageBase64 || typeof imageBase64 !== "string" || imageBase64.length === 0) {
      return new Response(JSON.stringify({ error: "Campo 'imageBase64' requerido" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    if (!mimeType || !ALLOWED_MIME_TYPES.has(mimeType)) {
      return new Response(
        JSON.stringify({ error: "mimeType debe ser image/jpeg, image/png o image/webp" }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } },
      );
    }

    if (imageBase64.length > MAX_BASE64_LENGTH) {
      return new Response(JSON.stringify({ error: "Imagen demasiado grande (máximo 3 MB)" }), {
        status: 413,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    try {
      const result = await extractFromReceipt(imageBase64, mimeType as AllowedMimeType);
      return new Response(JSON.stringify(result), {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    } catch (claudeErr) {
      console.error("ocr-receipt: Claude failed:", claudeErr);
      return new Response(JSON.stringify({ error: "No se pudo leer el ticket" }), {
        status: 422,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    console.error("ocr-receipt error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
