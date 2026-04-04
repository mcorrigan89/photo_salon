import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { orpc } from "@/lib/api-client";
import { useOrganizationId } from "@/lib/use-org";

export const Route = createFileRoute("/dashboard/")({
  component: MemberDashboard,
});

const MONTH_NAMES = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function MemberDashboard() {
  const { data: user } = useSuspenseQuery(orpc.currentUser.me.queryOptions());
  const organizationId = useOrganizationId();
  const { data: salons } = useSuspenseQuery(orpc.salon.list.queryOptions({ input: { organizationId } }));

  const openSalon = salons.find((s) => s.status === "open");
  const judgingSalon = salons.find((s) => s.status === "judging");
  const activeSalon = openSalon ?? judgingSalon;

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Welcome, {user?.name}</h1>
      <p className="text-muted-foreground text-sm mb-8">
        {user?.activeOrganization?.name}
      </p>

      {activeSalon ? (
        <div className="rounded-lg border border-border p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="font-semibold text-lg">{activeSalon.name}</h2>
              <p className="text-sm text-muted-foreground">
                {MONTH_NAMES[activeSalon.month]} {activeSalon.year}
              </p>
            </div>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              activeSalon.status === "open"
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            }`}>
              {activeSalon.status === "open" ? "Open for submissions" : "Judging in progress"}
            </span>
          </div>

          {activeSalon.categories.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2 text-zinc-500">Categories</h3>
              <div className="flex flex-wrap gap-2">
                {activeSalon.categories.map((c) => (
                  <span
                    key={c.id}
                    className="rounded-md border border-border px-3 py-1.5 text-sm"
                  >
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {activeSalon.status === "open" && (
            <p className="mt-4 text-sm text-muted-foreground">
              Photo submissions coming soon.
            </p>
          )}

          {activeSalon.status === "judging" && (
            <p className="mt-4 text-sm text-muted-foreground">
              Submissions are closed. Judging is underway.
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-border p-6">
          <p className="text-sm text-muted-foreground">
            No active salons right now. When your club opens a salon for submissions, it will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
