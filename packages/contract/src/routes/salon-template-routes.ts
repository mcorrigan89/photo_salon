import { oc } from "@orpc/contract";
import { z } from "zod";

export const templateCriterionDto = z.object({
  id: z.string(),
  templateId: z.string(),
  name: z.string(),
  minScore: z.number(),
  maxScore: z.number(),
  weight: z.string(),
  displayOrder: z.number(),
});

export const templateSlotDto = z.object({
  id: z.string(),
  templateId: z.string(),
  name: z.string(),
  maxSubmissionsPerMember: z.number().nullable(),
  displayOrder: z.number(),
});

export const salonTemplateDto = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  maxSubmissionsPerMember: z.number(),
  slideshowRevealMode: z.enum(["score_after", "score_alongside"]),
  createdAt: z.date(),
  updatedAt: z.date(),
  criteria: z.array(templateCriterionDto),
  slots: z.array(templateSlotDto),
});

export type SalonTemplateDto = z.infer<typeof salonTemplateDto>;
export type TemplateCriterionDto = z.infer<typeof templateCriterionDto>;
export type TemplateSlotDto = z.infer<typeof templateSlotDto>;

// ── Template routes ────────────────────────────────────────────────────────────

export const listTemplatesRoute = oc.output(z.array(salonTemplateDto));

export const getTemplateRoute = oc
  .input(z.object({ templateId: z.string() }))
  .output(salonTemplateDto);

export const createTemplateRoute = oc
  .input(
    z.object({
      name: z.string().min(1),
      maxSubmissionsPerMember: z.number().int().min(1).optional(),
      slideshowRevealMode: z.enum(["score_after", "score_alongside"]).optional(),
    }),
  )
  .output(salonTemplateDto);

export const updateTemplateRoute = oc
  .input(
    z.object({
      templateId: z.string(),
      name: z.string().min(1).optional(),
      maxSubmissionsPerMember: z.number().int().min(1).optional(),
      slideshowRevealMode: z.enum(["score_after", "score_alongside"]).optional(),
    }),
  )
  .output(salonTemplateDto);

export const deleteTemplateRoute = oc
  .input(z.object({ templateId: z.string() }))
  .output(z.object({ success: z.boolean() }));

// ── Criterion routes ───────────────────────────────────────────────────────────

export const addCriterionRoute = oc
  .input(
    z.object({
      templateId: z.string(),
      name: z.string().min(1),
      minScore: z.number().int().optional(),
      maxScore: z.number().int().optional(),
      weight: z.string().optional(),
      displayOrder: z.number().int().optional(),
    }),
  )
  .output(salonTemplateDto);

export const updateCriterionRoute = oc
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
  .output(salonTemplateDto);

export const removeCriterionRoute = oc
  .input(z.object({ criterionId: z.string() }))
  .output(salonTemplateDto);

// ── Slot routes ────────────────────────────────────────────────────────────────

export const addSlotRoute = oc
  .input(
    z.object({
      templateId: z.string(),
      name: z.string().min(1),
      maxSubmissionsPerMember: z.number().int().nullable().optional(),
      displayOrder: z.number().int().optional(),
    }),
  )
  .output(salonTemplateDto);

export const updateSlotRoute = oc
  .input(
    z.object({
      slotId: z.string(),
      name: z.string().min(1).optional(),
      maxSubmissionsPerMember: z.number().int().nullable().optional(),
      displayOrder: z.number().int().optional(),
    }),
  )
  .output(salonTemplateDto);

export const removeSlotRoute = oc
  .input(z.object({ slotId: z.string() }))
  .output(salonTemplateDto);
