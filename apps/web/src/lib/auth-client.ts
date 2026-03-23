import { createAuthClient } from "better-auth/react";
import { organizationClient, adminClient, magicLinkClient } from "better-auth/client/plugins";
import { getServerUrl } from "./config";

export const authClient = createAuthClient({
  baseURL: getServerUrl(),
  fetchOptions: {
    credentials: "include",
  },
  plugins: [organizationClient(), adminClient(), magicLinkClient()],
});

export const { signOut, useSession, organization, admin } = authClient;
export const signIn = authClient.signIn;
