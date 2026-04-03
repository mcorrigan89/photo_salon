import { serve } from "@hono/node-server";
import { getSharedEnv } from "@photo-salon/env/shared";
import { logger } from "@photo-salon/logger";
import { createApp } from "./app.ts";
import { ensureBucket } from "./lib/storage.ts";

// Initialize DI bindings
import "./lib/di.ts";

const env = getSharedEnv();
const app = createApp();

// Ensure S3 bucket exists before accepting requests
ensureBucket().catch((err) => {
  logger.warn("Failed to ensure S3 bucket at startup", err);
});

const server = serve(
  {
    fetch: app.fetch,
    port: 3001,
  },
  () => {
    logger.info(`Server started on ${env.SERVER_URL}`);
  },
);

process.on("SIGINT", () => {
  server.close();
  process.exit(0);
});
process.on("SIGTERM", () => {
  server.close();
  process.exit(0);
});
