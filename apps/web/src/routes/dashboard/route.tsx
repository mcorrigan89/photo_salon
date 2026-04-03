import { createFileRoute, redirect, Outlet, Link, useLocation } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/api-client";
import { signOut } from "@/lib/auth-client";

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

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const location = useLocation();
  const isActive = location.pathname === to || location.pathname.startsWith(to + "/");

  return (
    <Link
      to={to}
      className={`px-3 py-1.5 rounded-md text-sm transition-colors ${isActive
        ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900"
        : "text-zinc-400 hover:text-foreground"
        }`}
    >
      {children}
    </Link>
  );
}

function DashboardLayout() {
  const { data: user } = useSuspenseQuery(orpc.currentUser.me.queryOptions());
  const isAdmin = user?.activeOrganization?.memberRole === "admin";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <span className="text-sm font-semibold">{user?.activeOrganization?.name ?? "Photo Salon"}</span>
            <nav className="flex items-center gap-1">
              <NavLink to="/dashboard">Home</NavLink>
              <NavLink to="/dashboard/submissions">Submissions</NavLink>
              {isAdmin && <NavLink to="/dashboard/admin">Admin</NavLink>}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground">{user?.email}</span>
            <button
              onClick={() => signOut({ fetchOptions: { onSuccess: () => window.location.assign("/") } })}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
