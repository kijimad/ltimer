import { useEffect, useState, type ReactNode } from "react";
import initSqlJs from "sql.js";
import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import { DatabaseContext, type DatabaseState } from "../hooks/useDatabase.ts";
import { openDatabase } from "../db/database.ts";

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DatabaseState>({ db: null, error: null });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      initSqlJs({ locateFile: () => wasmUrl }),
      fetch(`${import.meta.env.BASE_URL}ltimer.db`).then((r) => {
        if (!r.ok) throw new Error(`ltimer.db: ${r.status}`);
        return r.arrayBuffer();
      }),
    ])
      .then(([SQL, buf]) => {
        if (!cancelled) setState({ db: openDatabase(SQL, new Uint8Array(buf)), error: null });
      })
      .catch((e) => {
        if (!cancelled) setState({ db: null, error: e.message });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <DatabaseContext.Provider value={state}>{children}</DatabaseContext.Provider>;
}
