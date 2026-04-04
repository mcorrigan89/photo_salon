import { Polar } from "@polar-sh/sdk";
import { getServerEnv } from "@photo-salon/env/server";

let polarClient: Polar | null = null;

export function getPolar(): Polar {
  if (!polarClient) {
    const env = getServerEnv();
    polarClient = new Polar({
      accessToken: env.POLAR_ACCESS_TOKEN,
      // Use sandbox API when not in production
      ...(env.NODE_ENV !== "production" && {
        server: "sandbox",
      }),
    });
  }
  return polarClient;
}
