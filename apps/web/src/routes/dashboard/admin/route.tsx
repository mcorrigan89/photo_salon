import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { orpc } from "@/lib/api-client";

export const Route = createFileRoute("/dashboard/admin")({
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.fetchQuery(orpc.currentUser.me.queryOptions());
    if (user?.activeOrganization?.memberRole !== "admin") {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  return <Outlet />;
}
