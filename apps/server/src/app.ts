import { LoggingHandlerPlugin } from "@orpc/experimental-pino";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { BatchHandlerPlugin, CORSPlugin } from "@orpc/server/plugins";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { getSharedEnv } from "@photo-salon/env/shared";
import { type Logger, logger } from "@photo-salon/logger";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { type AuthService } from "./lib/auth.ts";
import { createUserContext } from "./lib/context.ts";
import { di, authSymbol, loggerSymbol } from "./lib/di.ts";
import { handlePolarWebhook } from "./lib/polar-webhook.ts";
import { submissionController } from "./controllers/submission-controller.ts";
import { AppDomain } from "./domain/domain.ts";
import { routerImplementation } from "./routes/index.ts";

export function createApp() {
  const env = getSharedEnv();

  const handler = new RPCHandler(routerImplementation, {
    plugins: [
      new CORSPlugin({
        origin: [env.CLIENT_URL, env.SERVER_URL],
        credentials: true,
      }),
      new BatchHandlerPlugin(),
      new LoggingHandlerPlugin({
        logger,
        generateId: () => crypto.randomUUID(),
        logRequestAbort: false,
      }),
    ],
    interceptors: [
      onError((error) => {
        logger.error(error);
      }),
    ],
  });

  const openApiHandler = new OpenAPIHandler(routerImplementation, {
    plugins: [
      new CORSPlugin({
        origin: [env.CLIENT_URL, env.SERVER_URL],
        credentials: true,
      }),
      new OpenAPIReferencePlugin({
        docsProvider: "scalar",
        schemaConverters: [new ZodToJsonSchemaConverter()],
        specGenerateOptions: {
          info: { title: "Photo Salon API", version: "1.0.0" },
          servers: [{ url: `${env.SERVER_URL}/api` }],
        },
      }),
    ],
    interceptors: [
      onError((error) => {
        logger.error(error);
      }),
    ],
  });

  const app = new Hono();

  app.use(
    "/api/auth/*",
    cors({
      origin: [env.CLIENT_URL, env.SERVER_URL],
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["POST", "GET", "OPTIONS"],
      exposeHeaders: ["Content-Length"],
      maxAge: 600,
      credentials: true,
    }),
  );

  app.get("/", (c) => c.text("Photo Salon API"));

  app.post("/api/polar/webhook", async (c) => {
    const response = await handlePolarWebhook(c.req.raw);
    return c.newResponse(response.body, response);
  });

  // Digital photo upload (multipart — can't go through oRPC)
  app.post("/api/submissions/upload", async (c) => {
    const auth = di.get<AuthService>(authSymbol);
    const sessionData = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!sessionData?.user) return c.json({ error: "Unauthorized" }, 401);

    const appLogger = di.get<Logger>(loggerSymbol);
    const domain = di.get<AppDomain>(AppDomain);
    const ctx = createUserContext(
      { headers: c.req.raw.headers, domain, session: sessionData.session, user: sessionData.user },
      appLogger,
    );
    ctx.logger.setUserContext({ ...ctx, currentUserId: sessionData.user.id });

    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;
    const salonId = formData.get("salonId") as string | null;
    const categoryId = formData.get("categoryId") as string | null;
    const title = formData.get("title") as string | null;

    if (!file || !salonId || !categoryId || !title) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await submissionController.submitDigital(
      { ...ctx, currentUserId: sessionData.user.id },
      domain,
      { salonId, categoryId, title, file: buffer, filename: file.name, contentType: file.type },
    );
    return c.json(result);
  });

  app.on(["POST", "GET"], "/api/auth/*", (c) => {
    const auth = di.get<AuthService>(authSymbol);
    try {
      return auth.handler(c.req.raw);
    } catch (error) {
      logger.error(error, "Auth handler error:");
      return c.text("Internal Server Error", 500);
    }
  });

  app.use("/rpc/*", async (c, next) => {
    const appLogger = di.get<Logger>(loggerSymbol);
    const domain = di.get<AppDomain>(AppDomain);

    const { matched, response } = await handler.handle(c.req.raw, {
      prefix: "/rpc",
      context: createUserContext({ headers: c.req.raw.headers, domain }, appLogger),
    });

    if (matched) {
      return c.newResponse(response.body, response);
    }

    await next();
  });

  app.use("/api/*", async (c, next) => {
    const appLogger = di.get<Logger>(loggerSymbol);
    const domain = di.get<AppDomain>(AppDomain);

    const { matched, response } = await openApiHandler.handle(c.req.raw, {
      prefix: "/api",
      context: createUserContext({ headers: c.req.raw.headers, domain }, appLogger),
    });

    if (matched) {
      return c.newResponse(response.body, response);
    }

    await next();
  });

  return app;
}
