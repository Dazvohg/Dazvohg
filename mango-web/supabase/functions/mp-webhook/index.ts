// Deno Edge Function — MercadoPago webhook handler
// POST /functions/v1/mp-webhook
// Handles preapproval (subscription) lifecycle events

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")      ?? "";
const SUPABASE_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const MP_ACCESS_TOKEN  = Deno.env.get("MP_ACCESS_TOKEN")   ?? "";
const MP_WEBHOOK_SECRET = Deno.env.get("MP_WEBHOOK_SECRET") ?? "";

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const body = await req.text();

  // Verify MP signature (x-signature header)
  const sig = req.headers.get("x-signature") ?? "";
  const xRequestId = req.headers.get("x-request-id") ?? "";
  const url = new URL(req.url);
  const dataId = url.searchParams.get("data.id") ?? "";

  if (MP_WEBHOOK_SECRET) {
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${sig.split(",").find(p => p.startsWith("ts="))?.slice(3) ?? ""}`;
    const key = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(MP_WEBHOOK_SECRET),
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const expected = Array.from(
      new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest)))
    ).map(b => b.toString(16).padStart(2, "0")).join("");
    const received = sig.split(",").find(p => p.startsWith("v1="))?.slice(3) ?? "";
    if (expected !== received) {
      return new Response("Invalid signature", { status: 401 });
    }
  }

  const payload = JSON.parse(body);
  // MP sends: { type: "subscription_preapproval", data: { id: "..." } }
  if (payload.type !== "subscription_preapproval") {
    return new Response("ok", { status: 200 });
  }

  const preapprovalId = payload.data?.id as string;
  if (!preapprovalId) return new Response("Missing id", { status: 400 });

  // Fetch subscription details from MP
  const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
    headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
  });

  if (!mpRes.ok) return new Response("MP fetch failed", { status: 500 });
  const sub = await mpRes.json();

  // Map MP status to our schema
  const statusMap: Record<string, string> = {
    authorized: "active",
    paused:     "past_due",
    cancelled:  "cancelled",
    pending:    "trialing",
  };
  const status = statusMap[sub.status as string] ?? "cancelled";
  const userId = sub.external_reference as string;
  const periodEnd = sub.next_payment_date
    ? new Date(sub.next_payment_date as string).toISOString()
    : null;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE);

  await supabase.from("subscriptions").upsert({
    user_id:            userId,
    provider:           "mercadopago",
    provider_sub_id:    preapprovalId,
    status,
    current_period_end: periodEnd,
    updated_at:         new Date().toISOString(),
  }, { onConflict: "provider,provider_sub_id" });

  return new Response("ok", { status: 200 });
});
