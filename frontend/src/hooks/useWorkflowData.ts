import { useEffect, useState } from "react";
import type { WorkflowData, RawWorkflowData } from "../types/index.ts";
import { normalizeWorkflow } from "../normalize.ts";

export function useWorkflowData() {
  const [data, setData] = useState<WorkflowData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}workflow-data.json`)
      .then((r) => r.json())
      .then((raw: RawWorkflowData) => setData(normalizeWorkflow(raw)))
      .catch((e) => setError(e.message));
  }, []);

  return { data, error };
}
