import { createContext, useContext } from "react";
import type { Repository } from "../data/repository.ts";

export interface RepositoryState {
  repo: Repository | null;
  error: string | null;
}

export const RepositoryContext = createContext<RepositoryState>({ repo: null, error: null });

export function useRepository(): RepositoryState {
  return useContext(RepositoryContext);
}
