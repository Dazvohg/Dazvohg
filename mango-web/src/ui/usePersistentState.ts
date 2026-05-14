import { useEffect, useState } from "react";
import type { AppState } from "../domain/types";
import { loadState, saveState } from "../services/storage";

export function usePersistentState() {
  const [state, setState] = useState<AppState>(() => loadState());

  useEffect(() => {
    saveState(state);
  }, [state]);

  return [state, setState] as const;
}
