import { oc } from "@orpc/contract";
import { z } from "zod";

export const salonCriterionDto = z.object({
  id: z.string(),
  salonId: z.string(),
  name: z.string(),
  minScore: z.number(),
  maxScore: z.number(),
  weight: z.string(),
  displayOrder: z.number(),
});

export const salonCategoryDto = z.object({
  id: z.string(),
  salonId: z.string(),
  name: z.string(),
  maxSubmissionsPerMember: z.number().nullable(),
  displayOrder: z.number(),
});

export const salonDto = z.object({
  id: z.string(),
  organizationId: z.string(),
  templateId: z.string().nullable(),
  name: z.string(),
  year: z.number(),
  month: z.number(),
  status: z.enum(["draft", "open", "judging", "complete"]),
  judgeId: z.string().nullable(),
  maxSubmissionsPerMember: z.number(),
  slideshowRevealMode: z.enum(["score_after", "score_alongside"]),
  slideshowScheduledAt: z.date().nullable(),
  slideshowStartedAt: z.date().nullable(),
  submissionsCloseAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  criteria: z.array(salonCriterionDto),
  categories: z.array(salonCategoryDto),
});

export type SalonDto = z.infer<typeof salonDto>;
export type SalonCriterionDto = z.infer<typeof salonCriterionDto>;
export type SalonCategoryDto = z.infer<typeof salonCategoryDto>;

// ── Routes ────────────────────────────────────────────────────────────────────

export const listSalonsRoute = oc
  .input(z.object({ organizationId: z.string() }))
  .output(z.array(salonDto));

export const getSalonRoute = oc
  .input(z.object({ salonId: z.string() }))
  .output(salonDto);

export const createSalonRoute = oc
  .input(
    z.object({
      organizationId: z.string(),
      templateId: z.string(),
      name: z.string().min(1),
      year: z.number().int(),
      month: z.number().int().min(1).max(12),
    }),
  )
  .output(salonDto);

export const updateSalonRoute = oc
  .input(
    z.object({
      salonId: z.string(),
      name: z.string().min(1).optional(),
      judgeId: z.string().nullable().optional(),
      maxSubmissionsPerMember: z.number().int().min(1).optional(),
      slideshowRevealMode: z.enum(["score_after", "score_alongside"]).optional(),
      slideshowScheduledAt: z.date().nullable().optional(),
      submissionsCloseAt: z.date().nullable().optional(),
    }),
  )
  .output(salonDto);

export const transitionSalonRoute = oc
  .input(
    z.object({
      salonId: z.string(),
      status: z.enum(["draft", "open", "judging", "complete"]),
    }),
  )
  .output(salonDto);

export const deleteSalonRoute = oc
  .input(z.object({ salonId: z.string() }))
  .output(z.object({ success: z.boolean() }));

// ── Criterion routes ──────────────────────────────────────────────────────────

export const addSalonCriterionRoute = oc
  .input(
    z.object({
      salonId: z.string(),
      name: z.string().min(1),
      minScore: z.number().int(),
      maxScore: z.number().int(),
      weight: z.string(),
      displayOrder: z.number().int().optional(),
    }),
  )
  .output(salonDto);

export const updateSalonCriterionRoute = oc
  .input(
    z.object({
      criterionId: z.string(),
      name: z.string().min(1).optional(),
      minScore: z.number().int().optional(),
      maxScore: z.number().int().optional(),
      weight: z.string().optional(),
      displayOrder: z.number().int().optional(),
    }),
  )
  .output(salonDto);

export const removeSalonCriterionRoute = oc
  .input(z.object({ criterionId: z.string() }))
  .output(salonDto);

// ── Category routes ───────────────────────────────────────────────────────────

export const addCategoryRoute = oc
  .input(
    z.object({
      salonId: z.string(),
      name: z.string().min(1),
      maxSubmissionsPerMember: z.number().int().nullable().optional(),
      displayOrder: z.number().int().optional(),
    }),
  )
  .output(salonDto);

export const updateCategoryRoute = oc
  .input(
    z.object({
      categoryId: z.string(),
      name: z.string().min(1).optional(),
      maxSubmissionsPerMember: z.number().int().nullable().optional(),
      displayOrder: z.number().int().optional(),
    }),
  )
  .output(salonDto);

export const removeCategoryRoute = oc
  .input(z.object({ categoryId: z.string() }))
  .output(salonDto);
