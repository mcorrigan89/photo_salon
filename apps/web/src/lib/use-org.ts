import { useSuspenseQuery } from "@tanstack/react-query";
import { orpc } from "./api-client";

export function useOrganizationId(): string {
  const { data: user } = useSuspenseQuery(orpc.currentUser.me.queryOptions());
  const orgId = user?.activeOrganization?.id;
  if (!orgId) throw new Error("No active organization");
  return orgId;
}
