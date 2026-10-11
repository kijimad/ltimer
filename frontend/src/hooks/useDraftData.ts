import { useMemo } from "react";
import { useDatabase } from "./useDatabase.ts";
import { loadDraft } from "../db/queries.ts";

export function useDraftData() {
  const { db, error } = useDatabase();
  const data = useMemo(() => (db ? loadDraft(db) : null), [db]);
  return { data, error };
}
