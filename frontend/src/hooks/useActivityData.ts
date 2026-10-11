import { useEffect, useState } from "react";
import type { ActivityData, RawActivityData } from "../types/index.ts";
import { normalizeActivity } from "../normalize.ts";

export function useActivityData() {
  const [data, setData] = useState<ActivityData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}activity-data.json`)
      .then((r) => r.json())
      .then((raw: RawActivityData) => setData(normalizeActivity(raw)))
      .catch((e) => setError(e.message));
  }, []);

  return { data, error };
}
