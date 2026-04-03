import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { orpc } from "@/lib/api-client";
import { useOrganizationId } from "@/lib/use-org";
import { getServerUrl } from "@/lib/config";
import type { SalonDto, SubmissionDto } from "@photo-salon/contract";

export const Route = createFileRoute("/dashboard/")({
  component: MemberDashboard,
});

const MONTH_NAMES = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// ── Digital upload ────────────────────────────────────────────────────────────

function DigitalUploadForm({ salon, categoryId, onSuccess }: { salon: SalonDto; categoryId: string; onSuccess: () => void }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const form = useForm({
    defaultValues: { title: "" },
    onSubmit: async ({ value }) => {
      const file = fileRef.current?.files?.[0];
      if (!file || !value.title.trim()) return;

      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("salonId", salon.id);
        formData.append("categoryId", categoryId);
        formData.append("title", value.title.trim());

        const res = await fetch(`${getServerUrl()}/api/submissions/upload`, {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? "Upload failed");
        }

        toast.success("Photo submitted!");
        form.reset();
        if (fileRef.current) fileRef.current.value = "";
        onSuccess();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }} className="space-y-3">
      <form.Field name="title">
        {(field) => (
          <input
            className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            placeholder="Photo title"
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            required
          />
        )}
      </form.Field>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="block w-full text-sm text-zinc-500 file:mr-4 file:rounded file:border-0 file:bg-zinc-100 file:px-4 file:py-2 file:text-sm file:font-medium dark:file:bg-zinc-800 dark:file:text-zinc-300"
        required
      />
      <button
        type="submit"
        disabled={uploading}
        className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {uploading ? "Uploading…" : "Submit Photo"}
      </button>
    </form>
  );
}

// ── Print submit ──────────────────────────────────────────────────────────────

function PrintSubmitForm({ salon, categoryId, onSuccess }: { salon: SalonDto; categoryId: string; onSuccess: () => void }) {
  const submit = useMutation({
    ...orpc.submission.submitPrint.mutationOptions(),
    onSuccess: () => {
      toast.success("Print entry submitted!");
      onSuccess();
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to submit."),
  });

  const form = useForm({
    defaultValues: { title: "" },
    onSubmit: async ({ value }) => {
      if (!value.title.trim()) return;
      await submit.mutateAsync({ salonId: salon.id, categoryId, title: value.title.trim() });
      form.reset();
    },
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }} className="flex gap-2">
      <form.Field name="title">
        {(field) => (
          <input
            className="flex-1 rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            placeholder="Print title"
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            required
          />
        )}
      </form.Field>
      <button
        type="submit"
        disabled={submit.isPending}
        className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {submit.isPending ? "Submitting…" : "Submit Print"}
      </button>
    </form>
  );
}

// ── Submission card ───────────────────────────────────────────────────────────

function SubmissionCard({ submission, onWithdraw }: { submission: SubmissionDto; onWithdraw: () => void }) {
  return (
    <div className={`flex items-start gap-4 rounded-lg border border-border p-3 ${submission.status === "withdrawn" ? "opacity-50" : ""}`}>
      {submission.imageUrl ? (
        <img
          src={submission.imageUrl}
          alt={submission.title ?? ""}
          className="h-16 w-16 rounded object-cover"
        />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded bg-zinc-100 text-xs text-zinc-400 dark:bg-zinc-800">
          No img
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{submission.title ?? "Untitled"}</p>
        <p className="text-xs text-muted-foreground">
          {submission.originalFilename ?? "Print entry"}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {submission.status === "withdrawn" ? "Withdrawn" : "Submitted"}
        </p>
      </div>
      {submission.status !== "withdrawn" && (
        <button onClick={onWithdraw} className="text-xs text-red-500 hover:text-red-700 shrink-0">
          Withdraw
        </button>
      )}
    </div>
  );
}

// ── Active salon with submissions ─────────────────────────────────────────────

function ActiveSalonSubmissions({ salon }: { salon: SalonDto }) {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const activeCategoryId = selectedCategory || salon.categories[0]?.id || "";

  const { data: mySubmissions } = useSuspenseQuery(
    orpc.submission.listMine.queryOptions({
      input: { salonId: salon.id },
    }),
  );

  const withdraw = useMutation({
    ...orpc.submission.withdraw.mutationOptions(),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: orpc.submission.listMine.queryOptions({ input: { salonId: salon.id } }).queryKey });
      toast.success("Submission withdrawn.");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to withdraw."),
  });

  const handleSuccess = () => {
    queryClient.refetchQueries({ queryKey: orpc.submission.listMine.queryOptions({ input: { salonId: salon.id } }).queryKey });
  };

  const categorySubmissions = mySubmissions?.filter((s) => s.salonCategoryId === activeCategoryId) ?? [];
  const activeCount = categorySubmissions.filter((s) => s.status !== "withdrawn").length;
  const category = salon.categories.find((c) => c.id === activeCategoryId);
  const maxPerCategory = category?.maxSubmissionsPerMember ?? salon.maxSubmissionsPerMember;
  const totalActive = mySubmissions?.filter((s) => s.status !== "withdrawn").length ?? 0;

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">{salon.name}</h2>
          <p className="text-sm text-muted-foreground">
            {MONTH_NAMES[salon.month]} {salon.year}
          </p>
        </div>
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
          salon.status === "open"
            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
        }`}>
          {salon.status === "open" ? "Open" : "Judging"}
        </span>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {salon.categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCategory(c.id)}
            className={`px-4 py-2 text-sm border-b-2 transition-colors ${
              c.id === activeCategoryId
                ? "border-foreground font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Submit form (only when open) */}
      {salon.status === "open" && (
        activeCount < maxPerCategory ? (
          <div className="mb-8">
            {salon.medium === "digital" ? (
              <DigitalUploadForm salon={salon} categoryId={activeCategoryId} onSuccess={handleSuccess} />
            ) : (
              <PrintSubmitForm salon={salon} categoryId={activeCategoryId} onSuccess={handleSuccess} />
            )}
          </div>
        ) : (
          <div className="mb-8 rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">
              Maximum submissions reached for this category.
            </p>
          </div>
        )
      )}

      {salon.status === "judging" && (
        <div className="mb-8 rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Submissions are closed. Judging is underway.</p>
        </div>
      )}

      {/* My submissions in this category */}
      <h3 className="text-sm font-medium mb-3 text-zinc-500">
        Your submissions ({activeCount} / {maxPerCategory})
      </h3>
      {categorySubmissions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No submissions in this category yet.</p>
      ) : (
        <div className="space-y-2">
          {categorySubmissions.map((s) => (
            <SubmissionCard
              key={s.id}
              submission={s}
              onWithdraw={() => withdraw.mutate({ submissionId: s.id })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function MemberDashboard() {
  const { data: user } = useSuspenseQuery(orpc.currentUser.me.queryOptions());
  const organizationId = useOrganizationId();
  const { data: salons } = useSuspenseQuery(orpc.salon.list.queryOptions({ input: { organizationId } }));

  const openSalon = salons.find((s) => s.status === "open");
  const judgingSalon = salons.find((s) => s.status === "judging");
  const activeSalon = openSalon ?? judgingSalon;

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-2">Welcome, {user?.name}</h1>
      <p className="text-muted-foreground text-sm mb-8">
        {user?.activeOrganization?.name}
      </p>

      {activeSalon ? (
        <ActiveSalonSubmissions salon={activeSalon} />
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
