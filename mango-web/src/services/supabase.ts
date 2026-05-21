import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL  ?? "";
const key = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

// null cuando las env vars no están configuradas — la app funciona solo con localStorage
export const supabase = url && key ? createClient(url, key) : null;
