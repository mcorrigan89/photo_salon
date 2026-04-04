import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { toast } from "sonner";
import { orpc } from "@/lib/api-client";
import type { SalonTemplateDto, TemplateCriterionDto, TemplateSlotDto } from "@photo-salon/contract";

export const Route = createFileRoute("/dashboard/templates/$templateId")({
  component: TemplateDetailPage,
});

// ── Settings panel ────────────────────────────────────────────────────────────

function TemplateSettings({ template }: { template: SalonTemplateDto }) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries(orpc.salonTemplate.get.queryOptions({ input: { templateId: template.id } }));

  const update = useMutation({
    ...orpc.salonTemplate.update.mutationOptions(),
    onSuccess: () => { invalidate(); toast.success("Saved."); },
    onError: (err: Error) => toast.error(err.message ?? "Failed to save."),
  });

  const form = useForm({
    defaultValues: {
      name: template.name,
      maxSubmissionsPerMember: template.maxSubmissionsPerMember,
      slideshowRevealMode: template.slideshowRevealMode,
    },
    onSubmit: async ({ value }) => {
      await update.mutateAsync({ templateId: template.id, ...value });
    },
  });

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
            />
          </div>
        )}
      </form.Field>

      <form.Field name="slideshowRevealMode">
        {(field) => (
          <div>
            <label className="mb-1 block text-sm font-medium">Slideshow reveal</label>
            <select
              className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value as "score_after" | "score_alongside")}
            >
              <option value="score_after">Score after image</option>
              <option value="score_alongside">Score alongside image</option>
            </select>
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

// ── Criteria table ────────────────────────────────────────────────────────────

function CriteriaTable({ template }: { template: SalonTemplateDto }) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries(orpc.salonTemplate.get.queryOptions({ input: { templateId: template.id } }));
  const [editing, setEditing] = useState<string | null>(null);

  const add = useMutation({
    ...orpc.salonTemplate.addCriterion.mutationOptions(),
    onSuccess: () => { invalidate(); toast.success("Criterion added."); },
    onError: (err: Error) => toast.error(err.message ?? "Failed to add criterion."),
  });

  const remove = useMutation({
    ...orpc.salonTemplate.removeCriterion.mutationOptions(),
    onSuccess: () => { invalidate(); toast.success("Criterion removed."); },
    onError: (err: Error) => toast.error(err.message ?? "Failed to remove criterion."),
  });

  const addForm = useForm({
    defaultValues: { name: "", minScore: 1, maxScore: 10, weight: "1.00" },
    onSubmit: async ({ value }) => {
      await add.mutateAsync({
        templateId: template.id,
        name: value.name,
        minScore: value.minScore,
        maxScore: value.maxScore,
        weight: value.weight,
        displayOrder: template.criteria.length,
      });
      addForm.reset();
    },
  });

  return (
    <div>
      <h3 className="mb-3 font-semibold">Scoring Criteria</h3>
      <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-800/50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-zinc-500">Name</th>
              <th className="px-4 py-2 text-left font-medium text-zinc-500">Min</th>
              <th className="px-4 py-2 text-left font-medium text-zinc-500">Max</th>
              <th className="px-4 py-2 text-left font-medium text-zinc-500">Weight</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {template.criteria.map((c) => (
              <CriterionRow
                key={c.id}
                criterion={c}
                isEditing={editing === c.id}
                onEditStart={() => setEditing(c.id)}
                onEditEnd={() => setEditing(null)}
                onRemove={() => remove.mutate({ criterionId: c.id })}
                onSaved={invalidate}
              />
            ))}
            {/* Add row */}
            <tr className="bg-zinc-50/50 dark:bg-zinc-800/20">
              <td className="px-4 py-2">
                <addForm.Field name="name">
                  {(field) => (
                    <input
                      className="w-full rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                      placeholder="Criterion name"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  )}
                </addForm.Field>
              </td>
              <td className="px-4 py-2">
                <addForm.Field name="minScore">
                  {(field) => (
                    <input type="number" className="w-16 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800" value={field.state.value} onChange={(e) => field.handleChange(Number(e.target.value))} />
                  )}
                </addForm.Field>
              </td>
              <td className="px-4 py-2">
                <addForm.Field name="maxScore">
                  {(field) => (
                    <input type="number" className="w-16 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800" value={field.state.value} onChange={(e) => field.handleChange(Number(e.target.value))} />
                  )}
                </addForm.Field>
              </td>
              <td className="px-4 py-2">
                <addForm.Field name="weight">
                  {(field) => (
                    <input className="w-20 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800" value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} />
                  )}
                </addForm.Field>
              </td>
              <td className="px-4 py-2 text-right">
                <button
                  onClick={() => addForm.handleSubmit()}
                  disabled={add.isPending}
                  className="text-xs font-medium text-zinc-700 hover:text-zinc-900 disabled:opacity-50 dark:text-zinc-300"
                >
                  {add.isPending ? "Adding…" : "Add"}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CriterionRow({
  criterion, isEditing, onEditStart, onEditEnd, onRemove, onSaved,
}: {
  criterion: TemplateCriterionDto;
  isEditing: boolean;
  onEditStart: () => void;
  onEditEnd: () => void;
  onRemove: () => void;
  onSaved: () => void;
}) {
  const update = useMutation({
    ...orpc.salonTemplate.updateCriterion.mutationOptions(),
    onSuccess: () => { onSaved(); onEditEnd(); toast.success("Updated."); },
    onError: (err: Error) => toast.error(err.message ?? "Failed to update."),
  });

  const form = useForm({
    defaultValues: { name: criterion.name, minScore: criterion.minScore, maxScore: criterion.maxScore, weight: criterion.weight },
    onSubmit: async ({ value }) => {
      await update.mutateAsync({ criterionId: criterion.id, ...value });
    },
  });

  if (!isEditing) {
    return (
      <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
        <td className="px-4 py-2 font-medium">{criterion.name}</td>
        <td className="px-4 py-2 text-zinc-500">{criterion.minScore}</td>
        <td className="px-4 py-2 text-zinc-500">{criterion.maxScore}</td>
        <td className="px-4 py-2 text-zinc-500">{criterion.weight}×</td>
        <td className="px-4 py-2 text-right">
          <button onClick={onEditStart} className="mr-3 text-xs text-zinc-500 hover:text-foreground">Edit</button>
          <button onClick={onRemove} className="text-xs text-red-500 hover:text-red-700">Remove</button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="bg-blue-50/30 dark:bg-blue-950/20">
      <td className="px-4 py-2">
        <form.Field name="name">{(field) => <input className="w-full rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800" value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} />}</form.Field>
      </td>
      <td className="px-4 py-2">
        <form.Field name="minScore">{(field) => <input type="number" className="w-16 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800" value={field.state.value} onChange={(e) => field.handleChange(Number(e.target.value))} />}</form.Field>
      </td>
      <td className="px-4 py-2">
        <form.Field name="maxScore">{(field) => <input type="number" className="w-16 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800" value={field.state.value} onChange={(e) => field.handleChange(Number(e.target.value))} />}</form.Field>
      </td>
      <td className="px-4 py-2">
        <form.Field name="weight">{(field) => <input className="w-20 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800" value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} />}</form.Field>
      </td>
      <td className="px-4 py-2 text-right">
        <button onClick={() => form.handleSubmit()} disabled={update.isPending} className="mr-3 text-xs font-medium text-zinc-700 hover:text-zinc-900 disabled:opacity-50">
          {update.isPending ? "Saving…" : "Save"}
        </button>
        <button onClick={onEditEnd} className="text-xs text-zinc-500 hover:text-foreground">Cancel</button>
      </td>
    </tr>
  );
}

// ── Slots table ───────────────────────────────────────────────────────────────

function SlotsTable({ template }: { template: SalonTemplateDto }) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries(orpc.salonTemplate.get.queryOptions({ input: { templateId: template.id } }));
  const [editing, setEditing] = useState<string | null>(null);

  const add = useMutation({
    ...orpc.salonTemplate.addSlot.mutationOptions(),
    onSuccess: () => { invalidate(); toast.success("Slot added."); },
    onError: (err: Error) => toast.error(err.message ?? "Failed to add slot."),
  });

  const remove = useMutation({
    ...orpc.salonTemplate.removeSlot.mutationOptions(),
    onSuccess: () => { invalidate(); toast.success("Slot removed."); },
    onError: (err: Error) => toast.error(err.message ?? "Failed to remove slot."),
  });

  const addForm = useForm({
    defaultValues: { name: "", maxSubmissionsPerMember: "" },
    onSubmit: async ({ value }) => {
      await add.mutateAsync({
        templateId: template.id,
        name: value.name,
        maxSubmissionsPerMember: value.maxSubmissionsPerMember ? Number(value.maxSubmissionsPerMember) : null,
        displayOrder: template.slots.length,
      });
      addForm.reset();
    },
  });

  return (
    <div>
      <h3 className="mb-3 font-semibold">Category Slots</h3>
      <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-800/50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-zinc-500">Name</th>
              <th className="px-4 py-2 text-left font-medium text-zinc-500">Max submissions</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {template.slots.map((s) => (
              <SlotRow
                key={s.id}
                slot={s}
                isEditing={editing === s.id}
                onEditStart={() => setEditing(s.id)}
                onEditEnd={() => setEditing(null)}
                onRemove={() => remove.mutate({ slotId: s.id })}
                onSaved={invalidate}
              />
            ))}
            <tr className="bg-zinc-50/50 dark:bg-zinc-800/20">
              <td className="px-4 py-2">
                <addForm.Field name="name">
                  {(field) => (
                    <input
                      className="w-full rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                      placeholder="e.g. Nature, Travel"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  )}
                </addForm.Field>
              </td>
              <td className="px-4 py-2">
                <addForm.Field name="maxSubmissionsPerMember">
                  {(field) => (
                    <input
                      type="number"
                      min={1}
                      className="w-24 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                      placeholder="inherit"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                  )}
                </addForm.Field>
              </td>
              <td className="px-4 py-2 text-right">
                <button
                  onClick={() => addForm.handleSubmit()}
                  disabled={add.isPending}
                  className="text-xs font-medium text-zinc-700 hover:text-zinc-900 disabled:opacity-50 dark:text-zinc-300"
                >
                  {add.isPending ? "Adding…" : "Add"}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SlotRow({
  slot, isEditing, onEditStart, onEditEnd, onRemove, onSaved,
}: {
  slot: TemplateSlotDto;
  isEditing: boolean;
  onEditStart: () => void;
  onEditEnd: () => void;
  onRemove: () => void;
  onSaved: () => void;
}) {
  const update = useMutation({
    ...orpc.salonTemplate.updateSlot.mutationOptions(),
    onSuccess: () => { onSaved(); onEditEnd(); toast.success("Updated."); },
    onError: (err: Error) => toast.error(err.message ?? "Failed to update."),
  });

  const form = useForm({
    defaultValues: {
      name: slot.name,
      maxSubmissionsPerMember: slot.maxSubmissionsPerMember?.toString() ?? "",
    },
    onSubmit: async ({ value }) => {
      await update.mutateAsync({
        slotId: slot.id,
        name: value.name,
        maxSubmissionsPerMember: value.maxSubmissionsPerMember ? Number(value.maxSubmissionsPerMember) : null,
      });
    },
  });

  if (!isEditing) {
    return (
      <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
        <td className="px-4 py-2 font-medium">{slot.name}</td>
        <td className="px-4 py-2 text-zinc-500">
          {slot.maxSubmissionsPerMember ?? <span className="italic">inherit</span>}
        </td>
        <td className="px-4 py-2 text-right">
          <button onClick={onEditStart} className="mr-3 text-xs text-zinc-500 hover:text-foreground">Edit</button>
          <button onClick={onRemove} className="text-xs text-red-500 hover:text-red-700">Remove</button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="bg-blue-50/30 dark:bg-blue-950/20">
      <td className="px-4 py-2">
        <form.Field name="name">{(field) => <input className="w-full rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800" value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} />}</form.Field>
      </td>
      <td className="px-4 py-2">
        <form.Field name="maxSubmissionsPerMember">{(field) => <input type="number" min={1} placeholder="inherit" className="w-24 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800" value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} />}</form.Field>
      </td>
      <td className="px-4 py-2 text-right">
        <button onClick={() => form.handleSubmit()} disabled={update.isPending} className="mr-3 text-xs font-medium text-zinc-700 hover:text-zinc-900 disabled:opacity-50">
          {update.isPending ? "Saving…" : "Save"}
        </button>
        <button onClick={onEditEnd} className="text-xs text-zinc-500 hover:text-foreground">Cancel</button>
      </td>
    </tr>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function TemplateDetailPage() {
  const { templateId } = Route.useParams();
  const { data: template } = useSuspenseQuery(
    orpc.salonTemplate.get.queryOptions({ input: { templateId } }),
  );

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link to="/dashboard/templates" className="text-sm text-zinc-500 hover:text-foreground">
          ← Templates
        </Link>
      </div>

      <h1 className="mb-8 text-2xl font-bold">{template.name}</h1>

      <div className="grid gap-10 lg:grid-cols-[320px_1fr]">
        <div>
          <h2 className="mb-4 font-semibold text-zinc-700 dark:text-zinc-300">Settings</h2>
          <TemplateSettings template={template} />
        </div>

        <div className="space-y-10">
          <CriteriaTable template={template} />
          <SlotsTable template={template} />
        </div>
      </div>
    </div>
  );
}
