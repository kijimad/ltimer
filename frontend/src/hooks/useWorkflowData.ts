import { useMemo } from "react";
import { useDatabase } from "./useDatabase.ts";
import { loadWorkflow } from "../db/queries.ts";

export function useWorkflowData() {
  const { db, error } = useDatabase();
  const data = useMemo(() => (db ? loadWorkflow(db) : null), [db]);
  return { data, error };
}
