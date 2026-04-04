import { defineConfig } from "vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import viteTsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { nitroV2Plugin } from "@tanstack/nitro-v2-vite-plugin";
import { getSharedEnv } from "@photo-salon/env/shared";

const sharedEnv = getSharedEnv();

const config = defineConfig({
  define: {
    "process.env.NODE_ENV": JSON.stringify(sharedEnv.NODE_ENV),
  },
  plugins: [
    devtools(),
    nitroV2Plugin({
      compressPublicAssets: { gzip: true, brotli: true },
      routeRules: {
        "/assets/**": {
          cache: { maxAge: 31536000 },
          headers: { "cache-control": "public, max-age=31536000, immutable" },
        },
        "/favicon.*": {
          cache: { maxAge: 86400 },
          headers: { "cache-control": "public, max-age=86400" },
        },
      },
    }),
    viteTsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart({ srcDirectory: "src" }),
    viteReact({
      babel: { plugins: ["babel-plugin-react-compiler"] },
    }),
  ],
});

export default config;
