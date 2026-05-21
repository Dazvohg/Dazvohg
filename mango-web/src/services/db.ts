import { supabase } from "./supabase";
import { saveState } from "./storage";
import type { AppState } from "../domain/types";

export async function loadRemoteState(userId: string): Promise<AppState | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("user_state")
      .select("state")
      .eq("user_id", userId)
      .single();
    if (error || !data) return null;
    return data.state as AppState;
  } catch {
    return null;
  }
}

export async function saveRemoteState(userId: string, state: AppState): Promise<void> {
  if (!supabase) return;
  try {
    await supabase
      .from("user_state")
      .upsert({ user_id: userId, state, updated_at: new Date().toISOString() });
  } catch {
    // Silencioso: localStorage ya tiene la copia local
  }
}

export async function deleteRemoteState(userId: string): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from("user_state").delete().eq("user_id", userId);
  } catch { /* ignorar */ }
}

// Migra el estado de localStorage a Supabase y lo guarda en ambos lados
export async function migrateLocalToRemote(userId: string, state: AppState): Promise<void> {
  saveState(state);
  await saveRemoteState(userId, state);
}
