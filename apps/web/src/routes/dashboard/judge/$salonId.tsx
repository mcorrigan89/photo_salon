import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { orpc } from "@/lib/api-client";
import type { JudgingSubmissionDto, SalonDto } from "@photo-salon/contract";

export const Route = createFileRoute("/dashboard/judge/$salonId")({
  component: JudgingPage,
});

// ── Overview list ────────────────────────────────────────────────────────────

function OverviewList({
  submissions,
  salon,
  onSelect,
}: {
  submissions: JudgingSubmissionDto[];
  salon: SalonDto;
  onSelect: (index: number) => void;
}) {
  // Group by category
  const byCategory = new Map<string, JudgingSubmissionDto[]>();
  for (const sub of submissions) {
    const list = byCategory.get(sub.categoryId) ?? [];
    list.push(sub);
    byCategory.set(sub.categoryId, list);
  }

  const scored = submissions.filter((s) => s.score?.isComplete).length;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">All Submissions</h2>
          <p className="text-sm text-muted-foreground">
            {scored} / {submissions.length} scored
          </p>
        </div>
      </div>

      {salon.categories.map((cat) => {
        const catSubs = byCategory.get(cat.id) ?? [];
        if (catSubs.length === 0) return null;
        return (
          <div key={cat.id} className="mb-6">
            <h3 className="text-sm font-medium text-zinc-500 mb-2">{cat.name}</h3>
            <div className="space-y-1">
              {catSubs.map((sub) => {
                const globalIndex = submissions.indexOf(sub);
                return (
                  <button
                    key={sub.submissionId}
                    onClick={() => onSelect(globalIndex)}
                    className="w-full flex items-center gap-3 rounded-lg border border-border p-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                  >
                    {sub.imageUrl ? (
                      <img src={sub.imageUrl} alt={sub.title ?? ""} className="h-12 w-12 rounded object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded bg-zinc-100 text-xs text-zinc-400 dark:bg-zinc-800">
                        No img
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{sub.title ?? "Untitled"}</p>
                    </div>
                    <span className={`text-xs font-medium ${sub.score?.isComplete ? "text-green-600" : "text-zinc-400"}`}>
                      {sub.score?.isComplete ? `${sub.score.totalScore} pts` : "Unscored"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Scoring view ─────────────────────────────────────────────────────────────

function ScoringView({
  submission,
  salon,
  index,
  total,
  onPrev,
  onNext,
  onBack,
}: {
  submission: JudgingSubmissionDto;
  salon: SalonDto;
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const queryClient = useQueryClient();

  // Initialize criterion values from existing score or defaults
  const initialValues: Record<string, string> = {};
  for (const criterion of salon.criteria) {
    const existing = submission.score?.criterionValues.find(
      (v) => v.salonScoringCriterionId === criterion.id,
    );
    initialValues[criterion.id] = existing?.value ?? "";
  }

  const [values, setValues] = useState(initialValues);
  const [comment, setComment] = useState(submission.score?.comment ?? "");

  // Reset state when submission changes
  const [currentSubId, setCurrentSubId] = useState(submission.submissionId);
  if (currentSubId !== submission.submissionId) {
    setCurrentSubId(submission.submissionId);
    const newValues: Record<string, string> = {};
    for (const criterion of salon.criteria) {
      const existing = submission.score?.criterionValues.find(
        (v) => v.salonScoringCriterionId === criterion.id,
      );
      newValues[criterion.id] = existing?.value ?? "";
    }
    setValues(newValues);
    setComment(submission.score?.comment ?? "");
  }

  const save = useMutation({
    ...orpc.judging.saveScore.mutationOptions(),
    onSuccess: () => {
      queryClient.refetchQueries({
        queryKey: orpc.judging.submissions.queryOptions({ input: { salonId: salon.id } }).queryKey,
      });
      toast.success("Score saved.");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to save."),
  });

  const handleSave = () => {
    const criterionScores = Object.entries(values)
      .filter(([, v]) => v !== "")
      .map(([criterionId, value]) => ({ criterionId, value }));

    save.mutate({
      salonId: salon.id,
      submissionId: submission.submissionId,
      criterionScores,
      comment: comment || null,
    });
  };

  const handleSaveAndNext = () => {
    handleSave();
    if (index < total - 1) onNext();
  };

  return (
    <div>
      {/* Navigation bar */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="text-sm text-zinc-500 hover:text-foreground">
          ← Overview
        </button>
        <span className="text-sm text-muted-foreground">
          {index + 1} / {total}
        </span>
        <div className="flex gap-2">
          <button
            onClick={onPrev}
            disabled={index === 0}
            className="rounded border border-zinc-300 px-3 py-1 text-sm disabled:opacity-30 dark:border-zinc-700"
          >
            Prev
          </button>
          <button
            onClick={onNext}
            disabled={index === total - 1}
            className="rounded border border-zinc-300 px-3 py-1 text-sm disabled:opacity-30 dark:border-zinc-700"
          >
            Next
          </button>
        </div>
      </div>

      {/* Category label */}
      <p className="text-xs font-medium text-zinc-500 mb-2">{submission.categoryName}</p>

      {/* Photo */}
      <div className="mb-6">
        {submission.imageUrl ? (
          <img
            src={submission.imageUrl}
            alt={submission.title ?? ""}
            className="max-h-[500px] w-full rounded-lg object-contain bg-black"
          />
        ) : (
          <div className="flex h-64 items-center justify-center rounded-lg bg-zinc-100 text-zinc-400 dark:bg-zinc-800">
            No image — print entry
          </div>
        )}
      </div>

      {/* Title */}
      <h2 className="text-lg font-semibold mb-6">{submission.title ?? "Untitled"}</h2>

      {/* Scoring form */}
      <div className="space-y-4 mb-6">
        {salon.criteria.map((criterion) => (
          <div key={criterion.id}>
            <label className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">{criterion.name}</span>
              <span className="text-xs text-muted-foreground">
                {criterion.minScore}–{criterion.maxScore} · {criterion.weight}×
              </span>
            </label>
            <input
              type="number"
              min={criterion.minScore}
              max={criterion.maxScore}
              step="0.5"
              value={values[criterion.id] ?? ""}
              onChange={(e) => setValues({ ...values, [criterion.id]: e.target.value })}
              placeholder={`${criterion.minScore}–${criterion.maxScore}`}
              className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>
        ))}
      </div>

      {/* Comment */}
      <div className="mb-6">
        <label className="mb-1 block text-sm font-medium">Comment</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Optional feedback for the photographer..."
          rows={3}
          className="w-full rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={save.isPending}
          className="rounded border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          {save.isPending ? "Saving…" : "Save"}
        </button>
        <button
          onClick={handleSaveAndNext}
          disabled={save.isPending || index === total - 1}
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Save & Next
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function JudgingPage() {
  const { salonId } = Route.useParams();
  const { data: salon } = useSuspenseQuery(
    orpc.salon.get.queryOptions({ input: { salonId } }),
  );
  const { data: submissions } = useSuspenseQuery(
    orpc.judging.submissions.queryOptions({ input: { salonId } }),
  );

  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <Link to="/dashboard" className="text-sm text-zinc-500 hover:text-foreground">
          ← Dashboard
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-1">{salon.name}</h1>
      <p className="text-sm text-muted-foreground mb-8">Judging · {submissions.length} submissions</p>

      {submissions.length === 0 ? (
        <div className="rounded-lg border border-border p-6">
          <p className="text-sm text-muted-foreground">No submissions to judge.</p>
        </div>
      ) : activeIndex === null ? (
        <OverviewList
          submissions={submissions}
          salon={salon}
          onSelect={setActiveIndex}
        />
      ) : (
        <ScoringView
          submission={submissions[activeIndex]}
          salon={salon}
          index={activeIndex}
          total={submissions.length}
          onPrev={() => setActiveIndex(Math.max(0, activeIndex - 1))}
          onNext={() => setActiveIndex(Math.min(submissions.length - 1, activeIndex + 1))}
          onBack={() => setActiveIndex(null)}
        />
      )}
    </div>
  );
}
