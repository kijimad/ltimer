import type { Database } from "sql.js";
import { rows } from "./database.ts";

export function generatedAt(db: Database): string {
  return rows<{ value: string }>(db, "SELECT value FROM meta WHERE key = 'generated_at'")[0].value;
}
