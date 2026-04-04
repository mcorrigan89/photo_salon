import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/admin/")({
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
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Admin</h1>

      <div className="grid gap-3">
        <AdminLink
          to="/dashboard/admin/salons"
          title="Salons"
          description="Create and manage monthly salon events"
        />
        <AdminLink
          to="/dashboard/admin/templates"
          title="Salon Templates"
          description="Configure scoring criteria and category slots"
        />
        <AdminLink
          to="/dashboard/admin/members"
          title="Members"
          description="Add, edit, and remove club members"
        />
      </div>
    </div>
  );
}
