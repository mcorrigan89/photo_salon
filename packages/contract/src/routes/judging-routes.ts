import { oc } from "@orpc/contract";
import { z } from "zod";

export const criterionValueDto = z.object({
  id: z.string(),
  salonScoringCriterionId: z.string(),
  value: z.string(),
});

export const scoreDto = z.object({
  id: z.string(),
  submissionId: z.string(),
  comment: z.string().nullable(),
  totalScore: z.string().nullable(),
  isComplete: z.boolean(),
  criterionValues: z.array(criterionValueDto),
});

export const judgingSubmissionDto = z.object({
  submissionId: z.string(),
  title: z.string().nullable(),
  imageUrl: z.string().nullable(),
  categoryId: z.string(),
  categoryName: z.string(),
  score: scoreDto.nullable(),
});

export type JudgingSubmissionDto = z.infer<typeof judgingSubmissionDto>;
export type ScoreDto = z.infer<typeof scoreDto>;

export const getJudgingSubmissionsRoute = oc
  .input(z.object({ salonId: z.string() }))
  .output(z.array(judgingSubmissionDto));

export const saveScoreRoute = oc
  .input(
    z.object({
      salonId: z.string(),
      submissionId: z.string(),
      criterionScores: z.array(
        z.object({
          criterionId: z.string(),
          value: z.string(),
        }),
      ),
      comment: z.string().nullable(),
    }),
  )
  .output(scoreDto);
