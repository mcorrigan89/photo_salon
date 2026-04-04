import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import { orpc } from "@/lib/api-client";
import type { SlideshowSlideDto } from "@photo-salon/contract";

export const Route = createFileRoute("/slideshow/$salonId")({
  component: SlideshowPage,
});

type SlideType =
  | { type: "title"; categoryName: string }
  | { type: "submission"; slide: SlideshowSlideDto; revealed: boolean }
  | { type: "end" };

function buildSlideSequence(
  slides: SlideshowSlideDto[],
  categories: Array<{ id: string; name: string }>,
  revealMode: "score_after" | "score_alongside",
): SlideType[] {
  const sequence: SlideType[] = [];

  for (const category of categories) {
    const catSlides = slides.filter((s) => s.categoryId === category.id);
    if (catSlides.length === 0) continue;

    sequence.push({ type: "title", categoryName: category.name });

    for (const slide of catSlides) {
      if (revealMode === "score_after" && slide.meetsAwardThreshold) {
        // Two steps: show image, then reveal score
        sequence.push({ type: "submission", slide, revealed: false });
        sequence.push({ type: "submission", slide, revealed: true });
      } else {
        // Single step: show image with score if alongside mode, or without if below threshold
        sequence.push({
          type: "submission",
          slide,
          revealed: revealMode === "score_alongside" && slide.meetsAwardThreshold,
        });
      }
    }
  }

  sequence.push({ type: "end" });
  return sequence;
}

// ── Category title card ──────────────────────────────────────────────────────

function CategoryTitleSlide({ name }: { name: string }) {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-black">
      <h1 className="text-5xl font-bold text-white">{name}</h1>
    </div>
  );
}

// ── Submission slide ─────────────────────────────────────────────────────────

function SubmissionSlide({ slide, revealed }: { slide: SlideshowSlideDto; revealed: boolean }) {
  return (
    <div className="relative flex h-screen w-screen items-center justify-center bg-black">
      {/* Image */}
      {slide.imageUrl ? (
        <img
          src={slide.imageUrl}
          alt={slide.title ?? ""}
          className="max-h-[85vh] max-w-[90vw] object-contain"
        />
      ) : (
        <div className="flex h-64 w-96 items-center justify-center rounded-lg bg-zinc-900 text-zinc-500 text-xl">
          Print Entry
        </div>
      )}

      {/* Title bar at bottom */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-8 pb-6 pt-16">
        <p className="text-xl font-medium text-white">{slide.title ?? "Untitled"}</p>
        <p className="text-sm text-zinc-400">{slide.categoryName}</p>
      </div>

      {/* Score overlay */}
      {revealed && (
        <div className="absolute top-0 right-0 m-6 rounded-xl bg-black/80 p-6 backdrop-blur-sm max-w-sm">
          <div className="text-3xl font-bold text-white mb-3">
            {slide.totalScore} pts
          </div>
          {slide.criterionScores.length > 0 && (
            <div className="space-y-1 mb-3">
              {slide.criterionScores.map((cs, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">{cs.criterionName}</span>
                  <span className="text-white font-medium">{cs.value}</span>
                </div>
              ))}
            </div>
          )}
          {slide.comment && (
            <p className="text-sm text-zinc-300 italic border-t border-zinc-700 pt-3 mt-3">
              "{slide.comment}"
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── End card ─────────────────────────────────────────────────────────────────

function EndSlide({ salonName }: { salonName: string }) {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-black">
      <h1 className="text-4xl font-bold text-white mb-4">{salonName}</h1>
      <p className="text-xl text-zinc-400">End of Slideshow</p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function SlideshowPage() {
  const { salonId } = Route.useParams();
  const { data } = useSuspenseQuery(
    orpc.slideshow.get.queryOptions({ input: { salonId } }),
  );

  const sequence = buildSlideSequence(data.slides, data.salon.categories, data.salon.slideshowRevealMode);
  const [index, setIndex] = useState(0);

  const goNext = useCallback(() => {
    setIndex((i) => Math.min(i + 1, sequence.length - 1));
  }, [sequence.length]);

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

  // Keyboard + click navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "Escape") {
        window.history.back();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev]);

  const handleClick = (e: React.MouseEvent) => {
    // Click right half → next, left half → prev
    const rect = (e.target as HTMLElement).closest("[data-slideshow]")?.getBoundingClientRect();
    if (!rect) return goNext();
    if (e.clientX < rect.left + rect.width / 3) {
      goPrev();
    } else {
      goNext();
    }
  };

  const current = sequence[index];
  if (!current) return null;

  return (
    <div
      data-slideshow
      className="cursor-none select-none"
      onClick={handleClick}
    >
      {current.type === "title" && <CategoryTitleSlide name={current.categoryName} />}
      {current.type === "submission" && <SubmissionSlide slide={current.slide} revealed={current.revealed} />}
      {current.type === "end" && <EndSlide salonName={data.salon.name} />}

      {/* Progress indicator */}
      <div className="fixed bottom-2 left-1/2 -translate-x-1/2 text-xs text-zinc-600">
        {index + 1} / {sequence.length}
      </div>
    </div>
  );
}
