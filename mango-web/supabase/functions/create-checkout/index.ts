// Deno Edge Function — creates MercadoPago or Stripe checkout session
// POST /functions/v1/create-checkout
// Body: { provider: "mercadopago" | "stripe", plan: "monthly" | "annual" }
// Returns: { url: string }

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MP_ACCESS_TOKEN  = Deno.env.get("MP_ACCESS_TOKEN")  ?? "";
const STRIPE_SECRET    = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const APP_URL          = Deno.env.get("APP_URL")           ?? "https://usemango.app";
const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")      ?? "";
const SUPABASE_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// Price IDs configured in each platform
const MP_PLANS: Record<string, string> = {
  monthly: Deno.env.get("MP_PLAN_MONTHLY") ?? "",
  annual:  Deno.env.get("MP_PLAN_ANNUAL")  ?? "",
};
const STRIPE_PLANS: Record<string, string> = {
  monthly: Deno.env.get("STRIPE_PRICE_MONTHLY") ?? "",
  annual:  Deno.env.get("STRIPE_PRICE_ANNUAL")  ?? "",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE);

    // Auth: extract user from Bearer token
    const token = req.headers.get("authorization")?.replace("Bearer ", "") ?? "";
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS });
    }

    const { provider, plan = "monthly" } = await req.json() as {
      provider: "mercadopago" | "stripe";
      plan?: "monthly" | "annual";
    };

    let url: string;

    if (provider === "mercadopago") {
      url = await createMPCheckout(user.id, user.email ?? "", plan);
    } else if (provider === "stripe") {
      url = await createStripeCheckout(user.id, user.email ?? "", plan);
    } else {
      return new Response(JSON.stringify({ error: "Invalid provider" }), { status: 400, headers: CORS });
    }

    return new Response(JSON.stringify({ url }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-checkout error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: CORS });
  }
});

async function createMPCheckout(userId: string, email: string, plan: string): Promise<string> {
  const preapprovalPlanId = MP_PLANS[plan];
  if (!preapprovalPlanId) throw new Error("MP plan not configured");

  // Create a subscription link via MP Preapproval API
  const res = await fetch("https://api.mercadopago.com/preapproval_plan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      reason:       plan === "annual" ? "Mango Pro Anual" : "Mango Pro Mensual",
      external_reference: userId,
      payer_email:  email,
      auto_recurring: {
        frequency:      plan === "annual" ? 12 : 1,
        frequency_type: "months",
        transaction_amount: plan === "annual" ? 4800 : 499,
        currency_id: "ARS",
      },
      back_url: `${APP_URL}?checkout=success`,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`MP error: ${body}`);
  }

  const data = await res.json();
  // MP returns init_point URL for the subscriber to approve
  return data.init_point as string;
}

async function createStripeCheckout(userId: string, email: string, plan: string): Promise<string> {
  const priceId = STRIPE_PLANS[plan];
  if (!priceId) throw new Error("Stripe plan not configured");

  // Minimal Stripe checkout session via raw REST (no SDK needed in Deno)
  const params = new URLSearchParams({
    "mode":                            "subscription",
    "line_items[0][price]":            priceId,
    "line_items[0][quantity]":         "1",
    "customer_email":                  email,
    "client_reference_id":             userId,
    "success_url":                     `${APP_URL}?checkout=success`,
    "cancel_url":                      `${APP_URL}?checkout=cancel`,
    "subscription_data[metadata][user_id]": userId,
  });

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization:  `Bearer ${STRIPE_SECRET}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Stripe error: ${body}`);
  }

  const session = await res.json();
  return session.url as string;
}
