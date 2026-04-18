import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { toast } from "sonner";
import { orpc } from "@/lib/api-client";
import { useOrganizationId } from "@/lib/use-org";
import type { SalonDto, SalonCriterionDto, SalonCategoryDto } from "@photo-salon/contract";

export const Route = createFileRoute("/dashboard/admin/salons/$salonId")({
  component: SalonDetailPage,
});

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  open: "Open for submissions",
  judging: "Judging in progress",
  complete: "Complete",
};

const NEXT_STATUS: Record<string, { status: SalonDto["status"]; label: string } | null> = {
  draft: { status: "open", label: "Open for Submissions" },
  open: { status: "judging", label: "Start Judging" },
  judging: { status: "complete", label: "Mark Complete" },
  complete: null,
};

const PREV_STATUS: Record<string, { status: SalonDto["status"]; label: string } | null> = {
  draft: null,
  open: { status: "draft", label: "Revert to Draft" },
  judging: { status: "open", label: "Revert to Open" },
  complete: { status: "judging", label: "Revert to Judging" },
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
      window.location.assign("/dashboard/admin/salons");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to delete."),
  });

  const next = NEXT_STATUS[salon.status];
  const prev = PREV_STATUS[salon.status];

  return (
    <div className="flex items-center gap-3">
      {prev && (
        <button
          onClick={() => transition.mutate({ salonId: salon.id, status: prev.status })}
          disabled={transition.isPending}
          className="rounded border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {prev.label}
        </button>
      )}
      {next && (
        <button
          onClick={() => transition.mutate({ salonId: salon.id, status: next.status })}
          disabled={transition.isPending}
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {next.label}
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
  const organizationId = useOrganizationId();
  const { data: members } = useSuspenseQuery(orpc.member.list.queryOptions({ input: { organizationId } }));
  const judges = members.filter((m) => m.role === "judge" || m.role === "admin");

  const update = useMutation({
    ...orpc.salon.update.mutationOptions(),
    onSuccess: (data) => { setSalon(data); toast.success("Saved."); },
    onError: (err: Error) => toast.error(err.message ?? "Failed to save."),
  });

  const form = useForm({
    defaultValues: {
      name: salon.name,
      medium: salon.medium,
      judgeId: salon.judgeId ?? "",
      maxSubmissionsPerMember: salon.maxSubmissionsPerMember,
    },
    onSubmit: async ({ value }) => {
      await update.mutateAsync({
        salonId: salon.id,
        name: value.name,
        medium: value.medium,
        judgeId: value.judgeId || null,
        maxSubmissionsPerMember: value.maxSubmissionsPerMember,
      });
    },
  });

  const isDraft = salon.status === "draft";
  const isComplete = salon.status === "complete";

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
              disabled={!isDraft}
              required
            />
          </div>
        )}
      </form.Field>

      <form.Field name="medium">
        {(field) => (
          <div>
            <label className="mb-1 block text-sm font-medium">Medium</label>
            <select
              className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value as "digital" | "print")}
              disabled={!isDraft}
            >
              <option value="digital">Digital</option>
              <option value="print">Print</option>
            </select>
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
              disabled={!isDraft}
            />
          </div>
        )}
      </form.Field>

      <form.Field name="judgeId">
        {(field) => (
          <div>
            <label className="mb-1 block text-sm font-medium">Judge</label>
            <select
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              disabled={isComplete}
            >
              <option value="">No judge assigned</option>
              {judges.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.user.name} ({m.role})
                </option>
              ))}
            </select>
          </div>
        )}
      </form.Field>

      {!isComplete && <InviteExternalJudgeButton salon={salon} />}

      {!isComplete && (
        <button
          type="submit"
          disabled={update.isPending}
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {update.isPending ? "Saving…" : "Save settings"}
        </button>
      )}
    </form>
  );
}

// ── Invite external judge ────────────────────────────────────────────────────

function InviteExternalJudgeButton({ salon }: { salon: SalonDto }) {
  const [open, setOpen] = useState(false);
  const setSalon = useSetSalon(salon.id);

  const invite = useMutation({
    ...orpc.salon.inviteExternalJudge.mutationOptions(),
    onSuccess: (data) => {
      setSalon(data);
      toast.success("Judge invited. They'll receive a magic link email.");
      setOpen(false);
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to invite judge."),
  });

  const form = useForm({
    defaultValues: { name: "", email: "" },
    onSubmit: async ({ value }) => {
      if (!value.name.trim() || !value.email.trim()) return;
      await invite.mutateAsync({ salonId: salon.id, name: value.name.trim(), email: value.email.trim() });
    },
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-zinc-500 hover:text-foreground underline"
      >
        Or invite an external judge
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
            <h2 className="mb-1 text-lg font-semibold">Invite External Judge</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              A magic link will be emailed to them. They'll have access to judge this salon only — no full membership.
            </p>
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
                      required
                    />
                  </div>
                )}
              </form.Field>
              <form.Field name="email">
                {(field) => (
                  <div>
                    <label className="mb-1 block text-sm font-medium">Email</label>
                    <input
                      type="email"
                      className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      required
                    />
                  </div>
                )}
              </form.Field>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="rounded px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={invite.isPending}
                  className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {invite.isPending ? "Sending…" : "Send Invite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// ── Criteria table ───────────────────────────────────────────────────────────

function CriteriaTable({ salon }: { salon: SalonDto }) {
  const setSalon = useSetSalon(salon.id);
  const [editing, setEditing] = useState<string | null>(null);
  const isDraft = salon.status === "draft";

  const add = useMutation({
    ...orpc.salon.addCriterion.mutationOptions(),
    onSuccess: (data) => { setSalon(data); toast.success("Criterion added."); },
    onError: (err: Error) => toast.error(err.message ?? "Failed to add criterion."),
  });

  const remove = useMutation({
    ...orpc.salon.removeCriterion.mutationOptions(),
    onSuccess: (data) => { setSalon(data); toast.success("Criterion removed."); },
    onError: (err: Error) => toast.error(err.message ?? "Failed to remove criterion."),
  });

  const addForm = useForm({
    defaultValues: { name: "", minScore: 1, maxScore: 10, weight: "1.00" },
    onSubmit: async ({ value }) => {
      if (!value.name.trim()) return;
      await add.mutateAsync({
        salonId: salon.id,
        name: value.name.trim(),
        minScore: value.minScore,
        maxScore: value.maxScore,
        weight: value.weight,
        displayOrder: salon.criteria.length,
      });
      addForm.reset();
    },
  });

  return (
    <div>
      <h2 className="mb-3 font-semibold text-zinc-700 dark:text-zinc-300">Scoring Criteria</h2>
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-800/50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-zinc-500">Name</th>
              <th className="px-4 py-2 text-left font-medium text-zinc-500">Min</th>
              <th className="px-4 py-2 text-left font-medium text-zinc-500">Max</th>
              <th className="px-4 py-2 text-left font-medium text-zinc-500">Weight</th>
              {isDraft && <th className="px-4 py-2" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {salon.criteria.map((c) => (
              <CriterionRow
                key={c.id}
                criterion={c}
                isEditing={editing === c.id}
                onEditStart={() => setEditing(c.id)}
                onEditEnd={() => setEditing(null)}
                onRemove={() => remove.mutate({ criterionId: c.id })}
                onSaved={setSalon}
                isDraft={isDraft}
              />
            ))}
            {isDraft && (
              <tr className="bg-zinc-50/50 dark:bg-zinc-800/20">
                <td className="px-4 py-2">
                  <addForm.Field name="name">
                    {(field) => <input className="w-full rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800" placeholder="Criterion name" value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} />}
                  </addForm.Field>
                </td>
                <td className="px-4 py-2">
                  <addForm.Field name="minScore">
                    {(field) => <input type="number" className="w-16 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800" value={field.state.value} onChange={(e) => field.handleChange(Number(e.target.value))} />}
                  </addForm.Field>
                </td>
                <td className="px-4 py-2">
                  <addForm.Field name="maxScore">
                    {(field) => <input type="number" className="w-16 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800" value={field.state.value} onChange={(e) => field.handleChange(Number(e.target.value))} />}
                  </addForm.Field>
                </td>
                <td className="px-4 py-2">
                  <addForm.Field name="weight">
                    {(field) => <input className="w-20 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800" value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} />}
                  </addForm.Field>
                </td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => addForm.handleSubmit()} disabled={add.isPending} className="text-xs font-medium text-zinc-700 hover:text-zinc-900 disabled:opacity-50 dark:text-zinc-300">
                    {add.isPending ? "Adding…" : "Add"}
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CriterionRow({
  criterion, isEditing, onEditStart, onEditEnd, onRemove, onSaved, isDraft,
}: {
  criterion: SalonCriterionDto;
  isEditing: boolean;
  onEditStart: () => void;
  onEditEnd: () => void;
  onRemove: () => void;
  onSaved: (data: SalonDto) => void;
  isDraft: boolean;
}) {
  const update = useMutation({
    ...orpc.salon.updateCriterion.mutationOptions(),
    onSuccess: (data) => { onSaved(data); onEditEnd(); toast.success("Updated."); },
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
        {isDraft && (
          <td className="px-4 py-2 text-right">
            <button onClick={onEditStart} className="mr-3 text-xs text-zinc-500 hover:text-foreground">Edit</button>
            <button onClick={onRemove} className="text-xs text-red-500 hover:text-red-700">Remove</button>
          </td>
        )}
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

// ── Categories table ─────────────────────────────────────────────────────────

function CategoriesTable({ salon }: { salon: SalonDto }) {
  const setSalon = useSetSalon(salon.id);
  const [editing, setEditing] = useState<string | null>(null);
  const isDraft = salon.status === "draft";

  const add = useMutation({
    ...orpc.salon.addCategory.mutationOptions(),
    onSuccess: (data) => { setSalon(data); toast.success("Category added."); },
    onError: (err: Error) => toast.error(err.message ?? "Failed to add category."),
  });

  const remove = useMutation({
    ...orpc.salon.removeCategory.mutationOptions(),
    onSuccess: (data) => { setSalon(data); toast.success("Category removed."); },
    onError: (err: Error) => toast.error(err.message ?? "Failed to remove category."),
  });

  const addForm = useForm({
    defaultValues: { name: "", maxSubmissionsPerMember: "" },
    onSubmit: async ({ value }) => {
      if (!value.name.trim()) return;
      await add.mutateAsync({
        salonId: salon.id,
        name: value.name.trim(),
        maxSubmissionsPerMember: value.maxSubmissionsPerMember ? Number(value.maxSubmissionsPerMember) : null,
        displayOrder: salon.categories.length,
      });
      addForm.reset();
    },
  });

  return (
    <div>
      <h2 className="mb-3 font-semibold text-zinc-700 dark:text-zinc-300">Categories</h2>
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-800/50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-zinc-500">Name</th>
              <th className="px-4 py-2 text-left font-medium text-zinc-500">Max submissions</th>
              {isDraft && <th className="px-4 py-2" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {salon.categories.map((c) => (
              <CategoryRow
                key={c.id}
                category={c}
                salon={salon}
                isEditing={editing === c.id}
                onEditStart={() => setEditing(c.id)}
                onEditEnd={() => setEditing(null)}
                onRemove={() => remove.mutate({ categoryId: c.id })}
                onSaved={setSalon}
                isDraft={isDraft}
              />
            ))}
            {isDraft && (
              <tr className="bg-zinc-50/50 dark:bg-zinc-800/20">
                <td className="px-4 py-2">
                  <addForm.Field name="name">
                    {(field) => (
                      <input
                        className="w-full rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                        placeholder="Category name"
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
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CategoryRow({
  category, salon, isEditing, onEditStart, onEditEnd, onRemove, onSaved, isDraft,
}: {
  category: SalonCategoryDto;
  salon: SalonDto;
  isEditing: boolean;
  onEditStart: () => void;
  onEditEnd: () => void;
  onRemove: () => void;
  onSaved: (data: SalonDto) => void;
  isDraft: boolean;
}) {
  const update = useMutation({
    ...orpc.salon.updateCategory.mutationOptions(),
    onSuccess: (data) => { onSaved(data); onEditEnd(); toast.success("Updated."); },
    onError: (err: Error) => toast.error(err.message ?? "Failed to update."),
  });

  const form = useForm({
    defaultValues: {
      name: category.name,
      maxSubmissionsPerMember: category.maxSubmissionsPerMember?.toString() ?? "",
    },
    onSubmit: async ({ value }) => {
      await update.mutateAsync({
        categoryId: category.id,
        name: value.name,
        maxSubmissionsPerMember: value.maxSubmissionsPerMember ? Number(value.maxSubmissionsPerMember) : null,
      });
    },
  });

  if (!isEditing) {
    return (
      <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
        <td className="px-4 py-2 font-medium">{category.name}</td>
        <td className="px-4 py-2 text-zinc-500">
          {category.maxSubmissionsPerMember ?? <span className="italic">inherit ({salon.maxSubmissionsPerMember})</span>}
        </td>
        {isDraft && (
          <td className="px-4 py-2 text-right">
            <button onClick={onEditStart} className="mr-3 text-xs text-zinc-500 hover:text-foreground">Edit</button>
            <button onClick={onRemove} className="text-xs text-red-500 hover:text-red-700">Remove</button>
          </td>
        )}
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

// ── Submission summary (admin view when not draft) ───────────────────────────

function SubmissionSummary({ salon }: { salon: SalonDto }) {
  const { data: summary } = useSuspenseQuery(
    orpc.submission.salonSummary.queryOptions({ input: { salonId: salon.id } }),
  );

  // Group by member
  const memberMap = new Map<string, { name: string; number: string | null; categories: Map<string, number> }>();
  for (const row of summary) {
    if (!memberMap.has(row.memberId)) {
      memberMap.set(row.memberId, { name: row.memberName, number: row.memberNumber, categories: new Map() });
    }
    memberMap.get(row.memberId)!.categories.set(row.categoryId, row.count);
  }

  const members = Array.from(memberMap.entries()).sort((a, b) => a[1].name.localeCompare(b[1].name));
  const totalSubmissions = summary.reduce((sum, r) => sum + r.count, 0);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-zinc-700 dark:text-zinc-300">Submissions</h2>
        <span className="text-sm text-muted-foreground">{totalSubmissions} total</span>
      </div>

      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground">No submissions yet.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-zinc-500">Member</th>
                <th className="px-4 py-2 text-left font-medium text-zinc-500">#</th>
                {salon.categories.map((c) => (
                  <th key={c.id} className="px-4 py-2 text-center font-medium text-zinc-500">{c.name}</th>
                ))}
                <th className="px-4 py-2 text-center font-medium text-zinc-500">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {members.map(([memberId, member]) => {
                const total = Array.from(member.categories.values()).reduce((s, n) => s + n, 0);
                return (
                  <tr key={memberId} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                    <td className="px-4 py-2 font-medium">{member.name}</td>
                    <td className="px-4 py-2 text-zinc-500">{member.number ?? "—"}</td>
                    {salon.categories.map((c) => (
                      <td key={c.id} className="px-4 py-2 text-center text-zinc-500">
                        {member.categories.get(c.id) ?? 0}
                      </td>
                    ))}
                    <td className="px-4 py-2 text-center font-medium">{total}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

function SalonDetailPage() {
  const { salonId } = Route.useParams();
  const { data: salon } = useSuspenseQuery(
    orpc.salon.get.queryOptions({ input: { salonId } }),
  );

  const isDraft = salon.status === "draft";

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link to="/dashboard/admin/salons" className="text-sm text-zinc-500 hover:text-foreground">
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
        <div className="flex items-center gap-3">
          {(salon.status === "judging" || salon.status === "complete") && (
            <Link
              to="/slideshow/$salonId"
              params={{ salonId: salon.id }}
              target="_blank"
              className="rounded border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Launch Slideshow
            </Link>
          )}
          <StatusControls salon={salon} />
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-[320px_1fr]">
        <div>
          <h2 className="mb-4 font-semibold text-zinc-700 dark:text-zinc-300">Settings</h2>
          <SalonSettings salon={salon} />
        </div>
        <div className="space-y-8">
          {isDraft && (
            <>
              <CriteriaTable salon={salon} />
              <CategoriesTable salon={salon} />
            </>
          )}
          {!isDraft && <SubmissionSummary salon={salon} />}
        </div>
      </div>
    </div>
  );
}
