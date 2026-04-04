import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { toast } from "sonner";
import { orpc } from "@/lib/api-client";
import { useOrganizationId } from "@/lib/use-org";
export const Route = createFileRoute("/dashboard/admin/templates/")({
  component: TemplatesPage,
});

function CreateTemplateModal({ organizationId, onClose }: { organizationId: string; onClose: () => void }) {
  const queryClient = useQueryClient();

  const create = useMutation({
    ...orpc.salonTemplate.create.mutationOptions(),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: orpc.salonTemplate.list.queryOptions({ input: { organizationId } }).queryKey });
      toast.success("Template created.");
      onClose();
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to create template."),
  });

  const form = useForm({
    defaultValues: { name: "" },
    onSubmit: async ({ value }) => {
      await create.mutateAsync({ organizationId, name: value.name });
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-semibold">New Template</h2>
        <form
          onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}
          className="space-y-4"
        >
          <form.Field name="name">
            {(field) => (
              <div>
                <label className="mb-1 block text-sm font-medium">Name</label>
                <input
                  className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="e.g. Monthly Salon"
                  required
                />
              </div>
            )}
          </form.Field>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800">
              Cancel
            </button>
            <button
              type="submit"
              disabled={create.isPending}
              className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {create.isPending ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TemplatesPage() {
  const organizationId = useOrganizationId();
  const { data: templates } = useSuspenseQuery(orpc.salonTemplate.list.queryOptions({ input: { organizationId } }));
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const deleteTemplate = useMutation({
    ...orpc.salonTemplate.delete.mutationOptions(),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: orpc.salonTemplate.list.queryOptions({ input: { organizationId } }).queryKey });
      toast.success("Template deleted.");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to delete template."),
  });

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Salon Templates</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          New Template
        </button>
      </div>

      {templates.length === 0 ? (
        <p className="text-sm text-zinc-500">No templates yet. Create one to get started.</p>
      ) : (
        <div className="space-y-2">
          {templates.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800"
            >
              <div>
                <Link
                  to="/dashboard/admin/templates/$templateId"
                  params={{ templateId: t.id }}
                  className="font-medium hover:underline"
                >
                  {t.name}
                </Link>
                <p className="text-xs text-zinc-500">
                  {t.criteria.length} {t.criteria.length === 1 ? "criterion" : "criteria"} ·{" "}
                  {t.slots.length} {t.slots.length === 1 ? "slot" : "slots"} · max{" "}
                  {t.maxSubmissionsPerMember} submissions
                </p>
              </div>
              <button
                onClick={() => deleteTemplate.mutate({ templateId: t.id })}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreateTemplateModal organizationId={organizationId} onClose={() => setShowCreate(false)} />}
    </div>
  );
}
