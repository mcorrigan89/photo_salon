import { ORPCError } from "@orpc/server";
import { type UserContext } from "@/lib/context.ts";
import { type AppDomain } from "@/domain/domain.ts";
import { getSignedViewUrl } from "@/lib/storage.ts";
import { type SlideshowSlideDto } from "@photo-salon/contract";

export class SlideshowController {
  async getSlideshow(
    ctx: UserContext,
    domain: AppDomain,
    input: { salonId: string },
  ) {
    const salon = await domain.salonService.getSalon(ctx, input.salonId);
    if (salon.status !== "judging" && salon.status !== "complete") {
      throw new ORPCError("BAD_REQUEST", { message: "Slideshow is only available during judging or after completion." });
    }

    const allScores = await domain.scoringService.getScoresForSalon(ctx, input.salonId);
    const scoreBySubmission = new Map(allScores.map((s) => [s.submissionId, s]));

    const slides: SlideshowSlideDto[] = [];

    for (const category of salon.categories) {
      const submissions = await domain.submissionService.listByCategory(ctx, category.id);
      for (const sub of submissions) {
        if (sub.status === "withdrawn") continue;

        let imageUrl: string | null = null;
        if (sub.storageKey) {
          try { imageUrl = await getSignedViewUrl(sub.storageKey); } catch { /* */ }
        }

        const score = scoreBySubmission.get(sub.id);
        const totalScore = score?.totalScore ?? null;
        const meetsAwardThreshold = salon.awardThreshold
          ? totalScore !== null && parseFloat(totalScore) >= parseFloat(salon.awardThreshold)
          : totalScore !== null;

        const criterionScores = (score?.criterionValues ?? []).map((cv) => {
          const criterion = salon.criteria.find((c) => c.id === cv.salonScoringCriterionId);
          return {
            criterionName: criterion?.name ?? "Unknown",
            value: cv.value,
            weight: criterion?.weight ?? "1.00",
            minScore: criterion?.minScore ?? 0,
            maxScore: criterion?.maxScore ?? 10,
          };
        });

        slides.push({
          submissionId: sub.id,
          title: sub.title,
          imageUrl,
          categoryId: category.id,
          categoryName: category.name,
          totalScore,
          comment: score?.comment ?? null,
          criterionScores,
          meetsAwardThreshold,
        });
      }
    }

    // Sort: by category displayOrder, then deterministic hash within category
    slides.sort((a, b) => {
      if (a.categoryId !== b.categoryId) {
        const catA = salon.categories.findIndex((c) => c.id === a.categoryId);
        const catB = salon.categories.findIndex((c) => c.id === b.categoryId);
        return catA - catB;
      }
      return hashString(a.submissionId) - hashString(b.submissionId);
    });

    return {
      salon: {
        id: salon.id,
        name: salon.name,
        year: salon.year,
        month: salon.month,
        slideshowRevealMode: salon.slideshowRevealMode,
        awardThreshold: salon.awardThreshold,
        categories: salon.categories.map((c) => ({ id: c.id, name: c.name })),
      },
      slides,
    };
  }
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash;
}

export const slideshowController = new SlideshowController();
