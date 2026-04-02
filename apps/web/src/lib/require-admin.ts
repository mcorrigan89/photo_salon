import { redirect } from "@tanstack/react-router";
import { type QueryClient } from "@tanstack/react-query";
import { orpc } from "./api-client";

export async function requireAdmin(queryClient: QueryClient) {
  const user = await queryClient.fetchQuery(orpc.currentUser.me.queryOptions());
  if (user?.activeOrganization?.memberRole !== "admin") {
    throw redirect({ to: "/dashboard" });
  }
}
