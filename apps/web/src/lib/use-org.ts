import { useSession } from "./auth-client";

export function useOrganizationId(): string {
  const { data } = useSession();
  const orgId = data?.session?.activeOrganizationId;
  if (!orgId) throw new Error("No active organization");
  return orgId;
}
