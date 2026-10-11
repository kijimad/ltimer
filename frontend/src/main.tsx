import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { App } from "./App.tsx";
import { DatabaseProvider } from "./components/DatabaseProvider.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ChakraProvider value={defaultSystem}>
      <DatabaseProvider>
        <App />
      </DatabaseProvider>
    </ChakraProvider>
  </StrictMode>
);
