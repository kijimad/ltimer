import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { routes } from "./routes.tsx";
import { RepositoryContext } from "./hooks/useRepository.ts";
import { createTestRepository } from "./test/db.ts";
import { NOTES_DB } from "./test/fixtures.ts";

describe("routes", () => {
  it("redirects the old Draft tab to Notes", async () => {
    const router = createMemoryRouter(routes, { initialEntries: ["/draft"] });
    render(
      <ChakraProvider value={defaultSystem}>
        <RepositoryContext.Provider value={{ repo: createTestRepository(NOTES_DB), error: null }}>
          <RouterProvider router={router} />
        </RepositoryContext.Provider>
      </ChakraProvider>,
    );
    await waitFor(() => expect(screen.getByText("Notes Dashboard")).toBeInTheDocument());
    expect(router.state.location.pathname).toBe("/notes");
  });
});
