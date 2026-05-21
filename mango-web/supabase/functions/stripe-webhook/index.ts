// Deno Edge Function — Stripe webhook handler
// POST /functions/v1/stripe-webhook
// Handles subscription lifecycle events

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")             ?? "";
const SUPABASE_SERVICE  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const STRIPE_SECRET     = Deno.env.get("STRIPE_SECRET_KEY")        ?? "";
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const body = await req.text();
  const sig  = req.headers.get("stripe-signature") ?? "";

  // Verify Stripe webhook signature
  if (STRIPE_WEBHOOK_SECRET) {
    const ts      = sig.split(",").find(p => p.startsWith("t="))?.slice(2) ?? "";
    const v1      = sig.split(",").find(p => p.startsWith("v1="))?.slice(3) ?? "";
    const payload = `${ts}.${body}`;
    const key = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(STRIPE_WEBHOOK_SECRET),
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const expected = Array.from(
      new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)))
    ).map(b => b.toString(16).padStart(2, "0")).join("");
    if (expected !== v1) return new Response("Invalid signature", { status: 401 });
  }

  const event = JSON.parse(body);

  // Events that affect subscription status
  const handled = [
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "invoice.payment_failed",
  ];

  if (!handled.includes(event.type as string)) {
    return new Response("ok", { status: 200 });
  }

  const subscription = event.data.object;
  const userId = (subscription.metadata?.user_id as string) ?? "";

  if (!userId) {
    // Fallback: look up userId via customer email if metadata missing
    console.warn("Stripe webhook missing user_id in metadata, sub id:", subscription.id);
    return new Response("ok", { status: 200 });
  }

  const statusMap: Record<string, string> = {
    active:            "active",
    trialing:          "trialing",
    past_due:          "past_due",
    canceled:          "cancelled",
    unpaid:            "past_due",
    incomplete:        "past_due",
    incomplete_expired:"cancelled",
    paused:            "past_due",
  };
  const status = event.type === "invoice.payment_failed"
    ? "past_due"
    : (statusMap[subscription.status as string] ?? "cancelled");

  const periodEnd = subscription.current_period_end
    ? new Date((subscription.current_period_end as number) * 1000).toISOString()
    : null;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE);

  await supabase.from("subscriptions").upsert({
    user_id:            userId,
    provider:           "stripe",
    provider_sub_id:    subscription.id as string,
    status,
    current_period_end: periodEnd,
    updated_at:         new Date().toISOString(),
  }, { onConflict: "provider,provider_sub_id" });

  return new Response("ok", { status: 200 });
});
