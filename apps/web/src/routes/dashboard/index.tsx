import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/api-client";
import { signOut } from "@/lib/auth-client";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardPage,
});

function DashboardPage() {
  const { data: user } = useSuspenseQuery(orpc.currentUser.me.queryOptions());

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <button
          onClick={() => signOut({ fetchOptions: { onSuccess: () => window.location.assign("/") } })}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Sign out
        </button>
      </div>
      <p className="text-muted-foreground">Welcome, {user?.name}</p>
    </div>
  );
}
