import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { toast } from "sonner";
import { orpc } from "@/lib/api-client";
import { useOrganizationId } from "@/lib/use-org";
import type { SalonDto } from "@photo-salon/contract";

export const Route = createFileRoute("/dashboard/admin/salons/")({
  component: SalonsPage,
});

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
  open: { label: "Open", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  judging: { label: "Judging", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  complete: { label: "Complete", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
};

const MONTH_NAMES = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function CreateSalonModal({ organizationId, onClose }: { organizationId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: templates } = useSuspenseQuery(
    orpc.salonTemplate.list.queryOptions({ input: { organizationId } }),
  );

  const now = new Date();

  const create = useMutation({
    ...orpc.salon.create.mutationOptions(),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: orpc.salon.list.queryOptions({ input: { organizationId } }).queryKey });
      toast.success("Salon created.");
      onClose();
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to create salon."),
  });

  const form = useForm({
    defaultValues: {
      templateId: templates[0]?.id ?? "",
      name: "",
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    },
    onSubmit: async ({ value }) => {
      if (!value.templateId || !value.name.trim()) return;
      await create.mutateAsync({
        organizationId,
        templateId: value.templateId,
        name: value.name.trim(),
        year: value.year,
        month: value.month,
      });
    },
  });

  if (templates.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
          <h2 className="mb-4 text-lg font-semibold">Create Salon</h2>
          <p className="text-sm text-muted-foreground mb-4">
            You need at least one template before creating a salon.
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="rounded px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800">
              Cancel
            </button>
            <Link
              to="/dashboard/admin/templates"
              className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Create Template
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-semibold">Create Salon</h2>
        <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }} className="space-y-4">
          <form.Field name="templateId">
            {(field) => (
              <div>
                <label className="mb-1 block text-sm font-medium">Template</label>
                <select
                  className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}
          </form.Field>

          <form.Field name="name">
            {(field) => (
              <div>
                <label className="mb-1 block text-sm font-medium">Name</label>
                <input
                  className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  placeholder="e.g. March 2026 Salon"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  required
                />
              </div>
            )}
          </form.Field>

          <div className="grid grid-cols-2 gap-3">
            <form.Field name="year">
              {(field) => (
                <div>
                  <label className="mb-1 block text-sm font-medium">Year</label>
                  <input
                    type="number"
                    className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(Number(e.target.value))}
                  />
                </div>
              )}
            </form.Field>
            <form.Field name="month">
              {(field) => (
                <div>
                  <label className="mb-1 block text-sm font-medium">Month</label>
                  <select
                    className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(Number(e.target.value))}
                  >
                    {MONTH_NAMES.slice(1).map((name, i) => (
                      <option key={i + 1} value={i + 1}>{name}</option>
                    ))}
                  </select>
                </div>
              )}
            </form.Field>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800">
              Cancel
            </button>
            <button
              type="submit"
              disabled={create.isPending}
              className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {create.isPending ? "Creating…" : "Create Salon"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SalonCard({ salon }: { salon: SalonDto }) {
  const status = STATUS_LABELS[salon.status] ?? STATUS_LABELS.draft;
  return (
    <Link
      to="/dashboard/admin/salons/$salonId"
      params={{ salonId: salon.id }}
      className="block rounded-lg border border-border p-4 hover:border-zinc-500 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium">{salon.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {MONTH_NAMES[salon.month]} {salon.year} · {salon.categories.length} {salon.categories.length === 1 ? "category" : "categories"}
          </p>
        </div>
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}>
          {status.label}
        </span>
      </div>
    </Link>
  );
}

function SalonsPage() {
  const organizationId = useOrganizationId();
  const { data: salons } = useSuspenseQuery(orpc.salon.list.queryOptions({ input: { organizationId } }));
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Salons</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          New Salon
        </button>
      </div>

      {salons.length === 0 ? (
        <p className="text-sm text-muted-foreground">No salons yet. Create one from a template to get started.</p>
      ) : (
        <div className="space-y-2">
          {salons.map((s) => <SalonCard key={s.id} salon={s} />)}
        </div>
      )}

      {showCreate && <CreateSalonModal organizationId={organizationId} onClose={() => setShowCreate(false)} />}
    </div>
  );
}
