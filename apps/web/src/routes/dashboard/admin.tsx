import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { orpc } from "@/lib/api-client";

export const Route = createFileRoute("/dashboard/admin")({
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.fetchQuery(orpc.currentUser.me.queryOptions());
    if (user?.activeOrganization?.memberRole !== "admin") {
      throw redirect({ to: "/dashboard" });
    }
  },
  onEnter: async ({ context }) => {
    const user = await context.queryClient.fetchQuery(orpc.currentUser.me.queryOptions());
    if (!user?.activeOrganization) return;
    await Promise.all([
      context.queryClient.prefetchQuery(orpc.salonTemplate.list.queryOptions({
        input: {
          organizationId: user.activeOrganization?.id
        }
      })),
      context.queryClient.prefetchQuery(orpc.member.list.queryOptions({
        input: {
          organizationId: user.activeOrganization?.id
        }
      }))
    ])
  },
  component: AdminDashboard,
});

function AdminLink({ to, title, description }: { to: string; title: string; description: string }) {
  return (
    <Link
      to={to}
      className="block rounded-lg border border-border p-5 hover:border-zinc-500 transition-colors"
    >
      <h3 className="font-medium mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Link>
  );
}

function AdminDashboard() {
  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Admin</h1>

      <div className="grid gap-3">
        <AdminLink
          to="/dashboard/members"
          title="Members"
          description="Add, edit, and remove club members"
        />
        <AdminLink
          to="/dashboard/templates"
          title="Salon Templates"
          description="Configure scoring criteria and category slots"
        />
      </div>

      <div className="mt-8 rounded-lg border border-border p-6">
        <p className="text-sm text-muted-foreground">
          Salon management coming soon. Create salons from templates to open submissions.
        </p>
      </div>
    </div>
  );
}
