import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/api-client";

export const Route = createFileRoute("/dashboard/")({
  component: MemberDashboard,
});

function MemberDashboard() {
  const { data: user } = useSuspenseQuery(orpc.currentUser.me.queryOptions());

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Welcome, {user?.name}</h1>
      <p className="text-muted-foreground text-sm">
        {user?.activeOrganization?.name}
      </p>

      <div className="mt-8 rounded-lg border border-border p-6">
        <p className="text-sm text-muted-foreground">
          No active salons yet. When your club opens a salon for submissions, it will appear here.
        </p>
      </div>
    </div>
  );
}
