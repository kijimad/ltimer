import { useEffect, useState } from "react";
import type { DraftData } from "../types/index.ts";

export function useDraftData() {
  const [data, setData] = useState<DraftData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("draft-data.json")
      .then((r) => r.json())
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  return { data, error };
}
