import { z } from "zod";

const sharedSchema = z.object({
  SERVER_URL: z.string().url().default("http://localhost:3001"),
  CLIENT_URL: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type SharedEnv = z.infer<typeof sharedSchema>;

export function getSharedEnv(): SharedEnv {
  const env =
    typeof process !== "undefined"
      ? process.env
      : (import.meta as { env?: Record<string, string | undefined> }).env || {};

  const parsed = sharedSchema.safeParse(env);
  if (!parsed.success) {
    console.error("Invalid shared environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid shared environment variables");
  }
  return parsed.data;
}

let sharedEnv: SharedEnv | null = null;

export function useSharedEnv(): SharedEnv {
  if (!sharedEnv) {
    sharedEnv = getSharedEnv();
  }
  return sharedEnv;
}
