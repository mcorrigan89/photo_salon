import { z } from "zod";

const clientSchema = z.object({
  VITE_APP_NAME: z.string().default("Photo Salon"),
});

export type ClientEnv = z.infer<typeof clientSchema>;

export function getClientEnv(): ClientEnv {
  const env = (import.meta as { env?: Record<string, string | undefined> }).env || {};
  const parsed = clientSchema.safeParse(env);
  if (!parsed.success) {
    console.error("Invalid client environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid client environment variables");
  }
  return parsed.data;
}

let clientEnv: ClientEnv | null = null;

export function useClientEnv(): ClientEnv {
  if (!clientEnv) {
    clientEnv = getClientEnv();
  }
  return clientEnv;
}
