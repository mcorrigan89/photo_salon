import { oc } from "@orpc/contract";
import { z } from "zod";

export const slideshowSlideDto = z.object({
  submissionId: z.string(),
  title: z.string().nullable(),
  imageUrl: z.string().nullable(),
  categoryId: z.string(),
  categoryName: z.string(),
  totalScore: z.string().nullable(),
  comment: z.string().nullable(),
  criterionScores: z.array(
    z.object({
      criterionName: z.string(),
      value: z.string(),
      weight: z.string(),
      minScore: z.number(),
      maxScore: z.number(),
    }),
  ),
  meetsAwardThreshold: z.boolean(),
});

export type SlideshowSlideDto = z.infer<typeof slideshowSlideDto>;

export const getSlideshowRoute = oc
  .input(z.object({ salonId: z.string() }))
  .output(
    z.object({
      salon: z.object({
        id: z.string(),
        name: z.string(),
        year: z.number(),
        month: z.number(),
        slideshowRevealMode: z.enum(["score_after", "score_alongside"]),
        awardThreshold: z.string().nullable(),
        categories: z.array(z.object({ id: z.string(), name: z.string() })),
      }),
      slides: z.array(slideshowSlideDto),
    }),
  );
