import { useMemo } from "react";
import { useDatabase } from "./useDatabase.ts";
import { loadActivity } from "../db/queries.ts";

export function useActivityData() {
  const { db, error } = useDatabase();
  const data = useMemo(() => (db ? loadActivity(db) : null), [db]);
  return { data, error };
}
