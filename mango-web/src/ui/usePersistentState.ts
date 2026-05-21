import { useEffect, useRef, useState } from "react";
import type { AppState } from "../domain/types";
import { loadState, saveState } from "../services/storage";
import { loadRemoteState, saveRemoteState } from "../services/db";

export function usePersistentState(userId?: string) {
  const [state, setState] = useState<AppState>(() => loadState());
  const localTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cloudTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Al autenticarse: cargar estado remoto (tiene prioridad sobre localStorage)
  useEffect(() => {
    if (!userId) return;
    loadRemoteState(userId).then((remote) => {
      if (remote) setState(remote);
    });
  }, [userId]);

  // Guardar en localStorage (800ms) y en Supabase (2s) ante cualquier cambio
  useEffect(() => {
    if (localTimer.current) clearTimeout(localTimer.current);
    localTimer.current = setTimeout(() => saveState(state), 800);

    if (userId) {
      if (cloudTimer.current) clearTimeout(cloudTimer.current);
      cloudTimer.current = setTimeout(() => saveRemoteState(userId, state), 2000);
    }

    return () => {
      if (localTimer.current) clearTimeout(localTimer.current);
      if (cloudTimer.current) clearTimeout(cloudTimer.current);
    };
  }, [state, userId]);

  return [state, setState] as const;
}
