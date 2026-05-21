import { supabase } from "./supabase";

export type BillingProvider = "mercadopago" | "stripe";

export async function getIsPro(userId: string): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .maybeSingle();
  if (error || !data) return false;
  if (data.current_period_end && new Date(data.current_period_end as string) <= new Date()) return false;
  return true;
}

export async function createCheckout(
  provider: BillingProvider,
  plan: "monthly" | "annual"
): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured");

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`,
    {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        Authorization:   `Bearer ${session.access_token}`,
        apikey:          import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ provider, plan }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Checkout failed: ${err}`);
  }

  const { url } = await res.json() as { url: string };
  window.location.href = url;
}
