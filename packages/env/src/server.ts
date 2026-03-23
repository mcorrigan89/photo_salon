import { z } from "zod";

const serverSchema = z.object({
  DATABASE_URL: z.string().url(),

  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),

  EMAIL_ENABLED: z
    .string()
    .transform((v) => v === "true")
    .default(() => false),
  POSTMARK_API_KEY: z.string().default(""),
  EMAIL_FROM: z.string().email().default("noreply@photo-salon.local"),

  S3_ENDPOINT: z.string().url().default("http://localhost:9000"),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().default("photo-salon-media"),
  S3_ACCESS_KEY_ID: z.string().default("rustfsadmin"),
  S3_SECRET_ACCESS_KEY: z.string().default("rustfsadmin"),

  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3001),
});

export type ServerEnv = z.infer<typeof serverSchema>;

export function getServerEnv(): ServerEnv {
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid server environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid server environment variables");
  }
  return parsed.data;
}

let serverEnv: ServerEnv | null = null;

export function useServerEnv(): ServerEnv {
  if (!serverEnv) {
    serverEnv = getServerEnv();
  }
  return serverEnv;
}
