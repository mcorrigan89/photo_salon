import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { orpc } from "@/lib/api-client";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async ({ context }) => {
    const currentUser = await context.queryClient.fetchQuery(orpc.currentUser.me.queryOptions());
    if (!currentUser) {
      throw redirect({ to: "/login" });
    }
    const config = await context.queryClient.fetchQuery(orpc.onboarding.config.queryOptions());
    if (!config.hasOrganization) {
      throw redirect({ to: "/onboarding" });
    }
  },
  component: DashboardLayout,
});

function DashboardLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Outlet />
    </div>
  );
}
