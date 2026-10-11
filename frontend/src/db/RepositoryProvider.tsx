import { useEffect, useState, type ReactNode } from "react";
import initSqlJs from "sql.js";
import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import { RepositoryContext, type RepositoryState } from "../hooks/useRepository.ts";
import { openDatabase } from "./database.ts";
import { createSqlRepository } from "./sqlRepository.ts";

export function RepositoryProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RepositoryState>({ repo: null, error: null });

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
        if (!cancelled) setState({ repo: createSqlRepository(openDatabase(SQL, new Uint8Array(buf))), error: null });
      })
      .catch((e) => {
        if (!cancelled) setState({ repo: null, error: e.message });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <RepositoryContext.Provider value={state}>{children}</RepositoryContext.Provider>;
}
