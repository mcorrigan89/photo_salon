import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { orpc } from "@/lib/api-client";
import { useOrganizationId } from "@/lib/use-org";
import type { SalonDto, SubmissionDto } from "@photo-salon/contract";

export const Route = createFileRoute("/dashboard/history")({
  component: HistoryPage,
});

const MONTH_NAMES = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
  open: { label: "Open", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  judging: { label: "Judging", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  complete: { label: "Complete", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
};

function SalonHistoryCard({ salon }: { salon: SalonDto }) {
  const [expanded, setExpanded] = useState(false);
  const status = STATUS_LABELS[salon.status] ?? STATUS_LABELS.draft;

  return (
    <div className="rounded-lg border border-border">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
      >
        <div>
          <h3 className="font-medium">{salon.name}</h3>
          <p className="text-xs text-muted-foreground">
            {MONTH_NAMES[salon.month]} {salon.year} · {salon.categories.length} {salon.categories.length === 1 ? "category" : "categories"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}>
            {status.label}
          </span>
          <svg
            className={`h-4 w-4 text-zinc-400 transition-transform ${expanded ? "rotate-180" : ""}`}
            xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {expanded && <SalonSubmissions salon={salon} />}
    </div>
  );
}

function SalonSubmissions({ salon }: { salon: SalonDto }) {
  const { data: submissions } = useSuspenseQuery(
    orpc.submission.listMine.queryOptions({ input: { salonId: salon.id } }),
  );

  const activeSubmissions = submissions.filter((s) => s.status !== "withdrawn");

  if (activeSubmissions.length === 0) {
    return (
      <div className="border-t border-border px-4 py-3">
        <p className="text-sm text-muted-foreground">No submissions for this salon.</p>
      </div>
    );
  }

  // Group by category
  const byCategory = new Map<string, SubmissionDto[]>();
  for (const sub of activeSubmissions) {
    const list = byCategory.get(sub.salonCategoryId) ?? [];
    list.push(sub);
    byCategory.set(sub.salonCategoryId, list);
  }

  return (
    <div className="border-t border-border divide-y divide-zinc-100 dark:divide-zinc-800">
      {salon.categories.map((cat) => {
        const catSubs = byCategory.get(cat.id) ?? [];
        if (catSubs.length === 0) return null;
        return (
          <div key={cat.id} className="px-4 py-3">
            <h4 className="text-xs font-medium text-zinc-500 mb-2">{cat.name}</h4>
            <div className="space-y-2">
              {catSubs.map((sub) => (
                <div key={sub.id} className="flex items-center gap-3">
                  {sub.imageUrl ? (
                    <img src={sub.imageUrl} alt={sub.title ?? ""} className="h-10 w-10 rounded object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-zinc-100 text-xs text-zinc-400 dark:bg-zinc-800">
                      No img
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{sub.title ?? "Untitled"}</p>
                    <p className="text-xs text-muted-foreground">
                      {sub.originalFilename ?? "Print entry"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HistoryPage() {
  const organizationId = useOrganizationId();
  const { data: salons } = useSuspenseQuery(orpc.salon.list.queryOptions({ input: { organizationId } }));

  // Show all salons except draft (members shouldn't see drafts)
  const visibleSalons = salons
    .filter((s) => s.status !== "draft")
    .sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Salon History</h1>

      {visibleSalons.length === 0 ? (
        <div className="rounded-lg border border-border p-6">
          <p className="text-sm text-muted-foreground">No salon history yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visibleSalons.map((s) => (
            <SalonHistoryCard key={s.id} salon={s} />
          ))}
        </div>
      )}
    </div>
  );
}
