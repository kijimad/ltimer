import { useEffect, useState } from "react";
import type { WorkflowData } from "../types/index.ts";

export function useWorkflowData() {
  const [data, setData] = useState<WorkflowData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}workflow-data.json`)
      .then((r) => r.json())
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  return { data, error };
}
