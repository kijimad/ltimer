import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { RepositoryProvider } from "./RepositoryProvider.tsx";
import { useRepository } from "../hooks/useRepository.ts";
import { createTestDatabase } from "../test/db.ts";

// vite の ?url はテストでは実ファイルを指さないので、node で読める場所に向ける
vi.mock("sql.js/dist/sql-wasm.wasm?url", () => ({ default: "node_modules/sql.js/dist/sql-wasm.wasm" }));

function Probe() {
  const { repo, error } = useRepository();
  if (error) return <p>error: {error}</p>;
  return <p>{repo ? `generated: ${repo.generatedAt()}` : "loading"}</p>;
}

const bytes = new Uint8Array(createTestDatabase({ generatedAt: "2024-03-01T03:00:00Z" }).export());

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("RepositoryProvider", () => {
  it("opens ltimer.db and provides a repository", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(bytes));
    render(<RepositoryProvider><Probe /></RepositoryProvider>);
    expect(screen.getByText("loading")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("generated: 2024-03-01T03:00:00Z")).toBeInTheDocument());
    expect(fetch).toHaveBeenCalledWith(expect.stringMatching(/ltimer\.db$/));
  });

  it("reports an HTTP error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 404 }));
    render(<RepositoryProvider><Probe /></RepositoryProvider>);
    await waitFor(() => expect(screen.getByText("error: ltimer.db: 404")).toBeInTheDocument());
  });

  it("reports a network error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    render(<RepositoryProvider><Probe /></RepositoryProvider>);
    await waitFor(() => expect(screen.getByText("error: offline")).toBeInTheDocument());
  });

  it("ignores a load that finishes after unmounting", async () => {
    let resolve!: (r: Response) => void;
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise<Response>((r) => (resolve = r)));
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const { unmount } = render(<RepositoryProvider><Probe /></RepositoryProvider>);
    unmount();
    resolve(new Response(bytes));
    await new Promise((r) => setTimeout(r, 50));
    expect(errors).not.toHaveBeenCalled();
  });
});

