import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.spec.?(c|m)[jt]s?(x)"],
    coverage: {
      provider: "v8",
      include: ["./src/**/*.ts"],
    },
  },
});
