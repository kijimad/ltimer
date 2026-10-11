import { createContext, useContext } from "react";
import type { Database } from "sql.js";

export interface DatabaseState {
  db: Database | null;
  error: string | null;
}

export const DatabaseContext = createContext<DatabaseState>({ db: null, error: null });

export function useDatabase(): DatabaseState {
  return useContext(DatabaseContext);
}
