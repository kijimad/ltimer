import { describe, it, expect } from "vitest";
import { TABLES, LOCAL_TABLES } from "./rows.ts";
import { rows } from "./database.ts";
import { createTestDatabase } from "../test/db.ts";

const db = createTestDatabase({ generatedAt: "2024-03-01T03:00:00Z" });
const columns = (table: string) => rows<{ name: string }>(db, `SELECT name FROM pragma_table_info('${table}')`).map((r) => r.name);

describe("table columns", () => {
  it.each(Object.entries(TABLES))("schema.sql の %s が定義どおりの列を持つ", (table, expected) => {
    expect(columns(table)).toEqual(expected);
  });

  it.each(Object.entries(LOCAL_TABLES))("views.sql の %s が定義どおりの列を持つ", (table, expected) => {
    expect(columns(table)).toEqual(expected);
  });
});
