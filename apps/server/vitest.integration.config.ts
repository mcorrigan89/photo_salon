import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.integration.spec.?(c|m)[jt]s?(x)"],
    // Each file runs in its own worker for full DI isolation
    pool: "forks",
    coverage: {
      provider: "v8",
      include: ["./src/**/*.ts"],
    },
  },
});
