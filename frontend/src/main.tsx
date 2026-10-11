import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { App } from "./App.tsx";
import { RepositoryProvider } from "./db/RepositoryProvider.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ChakraProvider value={defaultSystem}>
      <RepositoryProvider>
        <App />
      </RepositoryProvider>
    </ChakraProvider>
  </StrictMode>
);
