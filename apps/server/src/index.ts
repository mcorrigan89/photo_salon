import { serve } from "@hono/node-server";
import { getSharedEnv } from "@photo-salon/env/shared";
import { logger } from "@photo-salon/logger";
import { createApp } from "./app.ts";

// Initialize DI bindings
import "./lib/di.ts";

const env = getSharedEnv();
const app = createApp();

const server = serve(
  {
    fetch: app.fetch,
    port: 3001,
  },
  () => {
    logger.info(`Server started on ${env.SERVER_URL}`);
  }
);

process.on("SIGINT", () => {
  server.close();
  process.exit(0);
});
process.on("SIGTERM", () => {
  server.close();
  process.exit(0);
});
