import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { orpc } from "@/lib/api-client";
import { useOrganizationId } from "@/lib/use-org";
import { requireAdmin } from "@/lib/require-admin";
import type { SalonDto } from "@photo-salon/contract";

export const Route = createFileRoute("/dashboard/salons/$salonId")({
  beforeLoad: async ({ context }) => requireAdmin(context.queryClient),
  component: SalonDetailPage,
});

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  open: "Open for submissions",
  judging: "Judging in progress",
  complete: "Complete",
};

const NEXT_STATUS: Record<string, { status: "open" | "judging" | "complete"; label: string } | null> = {
  draft: { status: "open", label: "Open for Submissions" },
  open: { status: "judging", label: "Start Judging" },
  judging: { status: "complete", label: "Mark Complete" },
  complete: null,
};

const MONTH_NAMES = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function useSetSalon(salonId: string) {
  const queryClient = useQueryClient();
  return (data: SalonDto) => {
    queryClient.setQueryData(
      orpc.salon.get.queryOptions({ input: { salonId } }).queryKey,
      data,
    );
  };
}

// ── Status controls ──────────────────────────────────────────────────────────

function StatusControls({ salon }: { salon: SalonDto }) {
  const setSalon = useSetSalon(salon.id);
  const organizationId = useOrganizationId();
  const queryClient = useQueryClient();

  const transition = useMutation({
    ...orpc.salon.transition.mutationOptions(),
    onSuccess: (data) => {
      setSalon(data);
      queryClient.refetchQueries({ queryKey: orpc.salon.list.queryOptions({ input: { organizationId } }).queryKey });
      toast.success(`Salon is now ${data.status}.`);
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to transition."),
  });

  const deleteSalon = useMutation({
    ...orpc.salon.delete.mutationOptions(),
    onSuccess: () => {
      toast.success("Salon deleted.");
      window.location.assign("/dashboard/salons");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to delete."),
  });

  const next = NEXT_STATUS[salon.status];

  return (
    <div className="flex items-center gap-3">
      {next && (
        <button
          onClick={() => transition.mutate({ salonId: salon.id, status: next.status })}
          disabled={transition.isPending}
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {transition.isPending ? "Transitioning…" : next.label}
        </button>
      )}
      {salon.status === "draft" && (
        <button
          onClick={() => deleteSalon.mutate({ salonId: salon.id })}
          disabled={deleteSalon.isPending}
          className="text-xs text-red-500 hover:text-red-700"
        >
          Delete
        </button>
      )}
    </div>
  );
}

// ── Settings panel ───────────────────────────────────────────────────────────

function SalonSettings({ salon }: { salon: SalonDto }) {
  const setSalon = useSetSalon(salon.id);

  const update = useMutation({
    ...orpc.salon.update.mutationOptions(),
    onSuccess: (data) => { setSalon(data); toast.success("Saved."); },
    onError: (err: Error) => toast.error(err.message ?? "Failed to save."),
  });

  const form = useForm({
    defaultValues: {
      name: salon.name,
      judgeId: salon.judgeId ?? "",
      maxSubmissionsPerMember: salon.maxSubmissionsPerMember,
    },
    onSubmit: async ({ value }) => {
      await update.mutateAsync({
        salonId: salon.id,
        name: value.name,
        judgeId: value.judgeId || null,
        maxSubmissionsPerMember: value.maxSubmissionsPerMember,
      });
    },
  });

  const isEditable = salon.status === "draft";

  return (
    <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }} className="space-y-4">
      <form.Field name="name">
        {(field) => (
          <div>
            <label className="mb-1 block text-sm font-medium">Name</label>
            <input
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              disabled={!isEditable}
              required
            />
          </div>
        )}
      </form.Field>

      <form.Field name="maxSubmissionsPerMember">
        {(field) => (
          <div>
            <label className="mb-1 block text-sm font-medium">Max submissions per member</label>
            <input
              type="number"
              min={1}
              className="w-32 rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              value={field.state.value}
              onChange={(e) => field.handleChange(Number(e.target.value))}
              disabled={!isEditable}
            />
          </div>
        )}
      </form.Field>

      <form.Field name="judgeId">
        {(field) => (
          <div>
            <label className="mb-1 block text-sm font-medium">
              Judge User ID <span className="text-zinc-400">(optional)</span>
            </label>
            <input
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              placeholder="Paste user ID"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </div>
        )}
      </form.Field>

      <button
        type="submit"
        disabled={update.isPending}
        className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {update.isPending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

function SalonDetailPage() {
  const { salonId } = Route.useParams();
  const { data: salon } = useSuspenseQuery(
    orpc.salon.get.queryOptions({ input: { salonId } }),
  );

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link to="/dashboard/salons" className="text-sm text-zinc-500 hover:text-foreground">
          ← Salons
        </Link>
      </div>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{salon.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {MONTH_NAMES[salon.month]} {salon.year} · {STATUS_LABELS[salon.status]}
          </p>
        </div>
        <StatusControls salon={salon} />
      </div>

      <div className="grid gap-10 lg:grid-cols-[320px_1fr]">
        <div>
          <h2 className="mb-4 font-semibold text-zinc-700 dark:text-zinc-300">Settings</h2>
          <SalonSettings salon={salon} />
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="mb-3 font-semibold text-zinc-700 dark:text-zinc-300">Scoring Criteria</h2>
            {salon.criteria.length === 0 ? (
              <p className="text-sm text-muted-foreground">No criteria (snapshotted from template at creation).</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-zinc-500">Name</th>
                      <th className="px-4 py-2 text-left font-medium text-zinc-500">Range</th>
                      <th className="px-4 py-2 text-left font-medium text-zinc-500">Weight</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {salon.criteria.map((c) => (
                      <tr key={c.id}>
                        <td className="px-4 py-2 font-medium">{c.name}</td>
                        <td className="px-4 py-2 text-zinc-500">{c.minScore}–{c.maxScore}</td>
                        <td className="px-4 py-2 text-zinc-500">{c.weight}×</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <h2 className="mb-3 font-semibold text-zinc-700 dark:text-zinc-300">Categories</h2>
            {salon.categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">No categories.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-zinc-500">Name</th>
                      <th className="px-4 py-2 text-left font-medium text-zinc-500">Max submissions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {salon.categories.map((c) => (
                      <tr key={c.id}>
                        <td className="px-4 py-2 font-medium">{c.name}</td>
                        <td className="px-4 py-2 text-zinc-500">
                          {c.maxSubmissionsPerMember ?? <span className="italic">inherit ({salon.maxSubmissionsPerMember})</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
