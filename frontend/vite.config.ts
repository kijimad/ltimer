/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { execSync } from "child_process";
import path from "path";
import type { Plugin } from "vite";

function orgDataPlugin(): Plugin {
  return {
    name: "org-data",
    configureServer() {
      const run = () => {
        console.log("[org-data] regenerating data...");
        try {
          execSync("make data", { cwd: path.resolve(__dirname, ".."), stdio: "inherit" });
        } catch {
          console.error("[org-data] data generation failed");
        }
      };
      const scheduleNext = () => {
        const now = new Date();
        const next = new Date(now);
        next.setMinutes(now.getMinutes() < 30 ? 30 : 60, 0, 0);
        setTimeout(() => { run(); scheduleNext(); }, next.getTime() - now.getTime());
      };
      run();
      scheduleNext();
    },
  };
}

export default defineConfig({
  base: "/ltimer/",
  plugins: [react(), orgDataPlugin()],
  server: { port: 3000 },
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
});
