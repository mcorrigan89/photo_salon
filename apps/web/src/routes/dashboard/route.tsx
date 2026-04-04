import { createFileRoute, redirect, Outlet, Link } from "@tanstack/react-router";
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

function NavLink({ to, exact = false, children }: { to: string; exact?: boolean; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      activeOptions={{ exact }}
      activeProps={{ className: "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900" }}
      className="px-3 py-1.5 rounded-md text-sm transition-colors text-zinc-400 hover:text-foreground"
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
              <NavLink to="/dashboard" exact>Home</NavLink>
              {isAdmin && <NavLink to="/dashboard/admin">Admin</NavLink>}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground">{user?.email}</span>
            <button
              onClick={() => {
                const isDark = document.documentElement.classList.toggle("dark");
                localStorage.setItem("theme", isDark ? "dark" : "light");
              }}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Toggle theme"
            >
              <svg className="hidden dark:block h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
              <svg className="block dark:hidden h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
            </button>
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
