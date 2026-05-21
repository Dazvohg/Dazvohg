import { useEffect, useRef, useState } from "react";
import type { AppState } from "../domain/types";
import { loadState, saveState } from "../services/storage";

export function usePersistentState() {
  const [state, setState] = useState<AppState>(() => loadState());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => saveState(state), 800);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [state]);

  return [state, setState] as const;
}
