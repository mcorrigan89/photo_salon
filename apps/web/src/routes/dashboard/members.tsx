import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import { toast } from "sonner";
import { orpc } from "@/lib/api-client";
import { useOrganizationId } from "@/lib/use-org";
import type { MemberDto } from "@photo-salon/contract";

export const Route = createFileRoute("/dashboard/members")({
  component: MembersPage,
});

// ── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  judge: "Judge",
  member: "Member",
};

// ── Add member modal ──────────────────────────────────────────────────────────

function AddMemberModal({ organizationId, onClose }: { organizationId: string; onClose: () => void }) {
  const queryClient = useQueryClient();

  const add = useMutation({
    ...orpc.member.add.mutationOptions(),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: orpc.member.list.queryOptions({ input: { organizationId } }).queryKey });
      toast.success("Member added.");
      onClose();
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to add member.");
    },
  });

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      memberNumber: "",
      role: "member" as "admin" | "judge" | "member",
    },
    onSubmit: async ({ value }) => {
      await add.mutateAsync({
        organizationId,
        name: value.name,
        email: value.email,
        memberNumber: value.memberNumber || null,
        role: value.role,
      });
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-semibold">Add Member</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
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

          <form.Field name="memberNumber">
            {(field) => (
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Member Number <span className="text-zinc-400">(optional)</span>
                </label>
                <input
                  className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </div>
            )}
          </form.Field>

          <form.Field name="role">
            {(field) => (
              <div>
                <label className="mb-1 block text-sm font-medium">Role</label>
                <select
                  className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  value={field.state.value}
                  onChange={(e) =>
                    field.handleChange(e.target.value as "admin" | "judge" | "member")
                  }
                >
                  <option value="member">Member</option>
                  <option value="judge">Judge</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            )}
          </form.Field>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={add.isPending}
              className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {add.isPending ? "Adding…" : "Add Member"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Edit member modal ─────────────────────────────────────────────────────────

function EditMemberModal({ member, organizationId, onClose }: { member: MemberDto; organizationId: string; onClose: () => void }) {
  const queryClient = useQueryClient();

  const update = useMutation({
    ...orpc.member.update.mutationOptions(),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: orpc.member.list.queryOptions({ input: { organizationId } }).queryKey });
      toast.success("Member updated.");
      onClose();
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to update member.");
    },
  });

  const form = useForm({
    defaultValues: {
      name: member.user.name,
      memberNumber: member.memberNumber ?? "",
      role: member.role as "admin" | "judge" | "member",
    },
    onSubmit: async ({ value }) => {
      await update.mutateAsync({
        memberId: member.id,
        name: value.name !== member.user.name ? value.name : undefined,
        memberNumber: value.memberNumber || null,
        role: value.role,
      });
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
        <h2 className="mb-1 text-lg font-semibold">Edit Member</h2>
        <p className="mb-4 text-sm text-zinc-500">{member.user.email}</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
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

          <form.Field name="memberNumber">
            {(field) => (
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Member Number <span className="text-zinc-400">(optional)</span>
                </label>
                <input
                  className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </div>
            )}
          </form.Field>

          <form.Field name="role">
            {(field) => (
              <div>
                <label className="mb-1 block text-sm font-medium">Role</label>
                <select
                  className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                  value={field.state.value}
                  onChange={(e) =>
                    field.handleChange(e.target.value as "admin" | "judge" | "member")
                  }
                >
                  <option value="member">Member</option>
                  <option value="judge">Judge</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            )}
          </form.Field>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={update.isPending}
              className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {update.isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Remove confirm modal ──────────────────────────────────────────────────────

function RemoveMemberModal({ member, organizationId, onClose }: { member: MemberDto; organizationId: string; onClose: () => void }) {
  const queryClient = useQueryClient();

  const remove = useMutation({
    ...orpc.member.remove.mutationOptions(),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: orpc.member.list.queryOptions({ input: { organizationId } }).queryKey });
      toast.success("Member removed.");
      onClose();
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Failed to remove member.");
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
        <h2 className="mb-2 text-lg font-semibold">Remove Member?</h2>
        <p className="mb-6 text-sm text-zinc-500">
          <span className="font-medium text-foreground">{member.user.name}</span> will be removed
          from this club. Their account will remain.
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            onClick={() => remove.mutate({ memberId: member.id })}
            disabled={remove.isPending}
            className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {remove.isPending ? "Removing…" : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Modal =
  | { type: "add" }
  | { type: "edit"; member: MemberDto }
  | { type: "remove"; member: MemberDto };

function MembersPage() {
  const organizationId = useOrganizationId();
  const { data: members } = useSuspenseQuery(orpc.member.list.queryOptions({ input: { organizationId } }));
  const [modal, setModal] = useState<Modal | null>(null);

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Members</h1>
        <button
          onClick={() => setModal({ type: "add" })}
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Add Member
        </button>
      </div>

      {members.length === 0 ? (
        <p className="text-sm text-zinc-500">No members yet. Add your first member above.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Name</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Email</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Member #</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Role</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                  <td className="px-4 py-3 font-medium">{m.user.name}</td>
                  <td className="px-4 py-3 text-zinc-500">{m.user.email}</td>
                  <td className="px-4 py-3 text-zinc-500">{m.memberNumber ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium dark:bg-zinc-800">
                      {ROLE_LABELS[m.role] ?? m.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setModal({ type: "edit", member: m })}
                      className="mr-3 text-xs text-zinc-500 hover:text-foreground"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setModal({ type: "remove", member: m })}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal?.type === "add" && <AddMemberModal organizationId={organizationId} onClose={() => setModal(null)} />}
      {modal?.type === "edit" && (
        <EditMemberModal member={modal.member} organizationId={organizationId} onClose={() => setModal(null)} />
      )}
      {modal?.type === "remove" && (
        <RemoveMemberModal member={modal.member} organizationId={organizationId} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
