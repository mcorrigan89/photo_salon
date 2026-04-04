import { oc } from "@orpc/contract";
import { z } from "zod";

export const submissionScoreDto = z.object({
  totalScore: z.string().nullable(),
  comment: z.string().nullable(),
  isComplete: z.boolean(),
  criterionValues: z.array(
    z.object({
      criterionName: z.string(),
      value: z.string(),
    }),
  ),
});

export const submissionDto = z.object({
  id: z.string(),
  salonCategoryId: z.string(),
  memberId: z.string(),
  storageKey: z.string().nullable(),
  originalFilename: z.string().nullable(),
  fileSizeBytes: z.number().nullable(),
  widthPx: z.number().nullable(),
  heightPx: z.number().nullable(),
  status: z.enum(["pending", "accepted", "withdrawn"]),
  title: z.string().nullable(),
  imageUrl: z.string().nullable(),
  score: submissionScoreDto.nullable(),
  submittedAt: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type SubmissionDto = z.infer<typeof submissionDto>;

export const listMySubmissionsRoute = oc
  .input(z.object({ salonId: z.string() }))
  .output(z.array(submissionDto));

export const listAllMySubmissionsRoute = oc
  .output(z.array(submissionDto));

export const submitPrintRoute = oc
  .input(
    z.object({
      salonId: z.string(),
      categoryId: z.string(),
      title: z.string().min(1),
    }),
  )
  .output(submissionDto);

export const withdrawSubmissionRoute = oc
  .input(z.object({ submissionId: z.string() }))
  .output(submissionDto);

// ── Admin routes ──────────────────────────────────────────────────────────────

export const salonSubmissionSummaryDto = z.object({
  memberId: z.string(),
  memberName: z.string(),
  memberNumber: z.string().nullable(),
  categoryId: z.string(),
  categoryName: z.string(),
  count: z.number(),
});

export type SalonSubmissionSummaryDto = z.infer<typeof salonSubmissionSummaryDto>;

export const getSalonSubmissionSummaryRoute = oc
  .input(z.object({ salonId: z.string() }))
  .output(z.array(salonSubmissionSummaryDto));
