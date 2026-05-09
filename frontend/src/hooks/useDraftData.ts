import { useEffect, useState } from "react";
import type { DraftData } from "../types/index.ts";

export function useDraftData() {
  const [data, setData] = useState<DraftData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}draft-data.json`)
      .then((r) => r.json())
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  return { data, error };
}
