import { ORPCError } from "@orpc/server";
import { type UserContext } from "@/lib/context.ts";
import { type AppDomain } from "@/domain/domain.ts";
import {
  type SalonTemplateDto,
  type TemplateCriterionDto,
  type TemplateSlotDto,
} from "@photo-salon/contract";
import { type SalonTemplateEntity } from "@/domain/salon-templates/salon-template-entity.ts";
import { type TemplateScoringCriterionEntity } from "@/domain/salon-templates/template-scoring-criterion-entity.ts";
import { type TemplateCategorySlotEntity } from "@/domain/salon-templates/template-category-slot-entity.ts";

function criterionToDto(c: TemplateScoringCriterionEntity): TemplateCriterionDto {
  return {
    id: c.id,
    templateId: c.templateId,
    name: c.name,
    minScore: c.minScore,
    maxScore: c.maxScore,
    weight: c.weight,
    displayOrder: c.displayOrder,
  };
}

function slotToDto(s: TemplateCategorySlotEntity): TemplateSlotDto {
  return {
    id: s.id,
    templateId: s.templateId,
    name: s.name,
    maxSubmissionsPerMember: s.maxSubmissionsPerMember,
    displayOrder: s.displayOrder,
  };
}

function toDto(entity: SalonTemplateEntity): SalonTemplateDto {
  return {
    id: entity.id,
    organizationId: entity.organizationId,
    name: entity.name,
    maxSubmissionsPerMember: entity.maxSubmissionsPerMember,
    slideshowRevealMode: entity.slideshowRevealMode,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
    criteria: entity.criteria.map(criterionToDto),
    slots: entity.slots.map(slotToDto),
  };
}

function requireActiveOrg(ctx: UserContext): string {
  const orgId = ctx.session?.activeOrganizationId;
  if (!orgId) throw new ORPCError("FORBIDDEN", { message: "No active organization." });
  return orgId;
}

export class SalonTemplateController {
  async listTemplates(ctx: UserContext, domain: AppDomain): Promise<SalonTemplateDto[]> {
    const orgId = requireActiveOrg(ctx);
    const templates = await domain.salonTemplateService.listTemplates(ctx, orgId);
    return templates.map(toDto);
  }

  async getTemplate(
    ctx: UserContext,
    domain: AppDomain,
    templateId: string,
  ): Promise<SalonTemplateDto> {
    const template = await domain.salonTemplateService.getTemplate(ctx, templateId);
    return toDto(template);
  }

  async createTemplate(
    ctx: UserContext,
    domain: AppDomain,
    input: { name: string; maxSubmissionsPerMember?: number; slideshowRevealMode?: "score_after" | "score_alongside" },
  ): Promise<SalonTemplateDto> {
    const orgId = requireActiveOrg(ctx);
    const template = await domain.salonTemplateService.createTemplate(ctx, { ...input, organizationId: orgId });
    return toDto(template);
  }

  async updateTemplate(
    ctx: UserContext,
    domain: AppDomain,
    input: { templateId: string; name?: string; maxSubmissionsPerMember?: number; slideshowRevealMode?: "score_after" | "score_alongside" },
  ): Promise<SalonTemplateDto> {
    const template = await domain.salonTemplateService.updateTemplate(ctx, input);
    return toDto(template);
  }

  async deleteTemplate(
    ctx: UserContext,
    domain: AppDomain,
    templateId: string,
  ): Promise<{ success: boolean }> {
    await domain.salonTemplateService.deleteTemplate(ctx, templateId);
    return { success: true };
  }

  async addCriterion(
    ctx: UserContext,
    domain: AppDomain,
    input: { templateId: string; name: string; minScore?: number; maxScore?: number; weight?: string; displayOrder?: number },
  ): Promise<SalonTemplateDto> {
    const template = await domain.salonTemplateService.addCriterion(ctx, input);
    return toDto(template);
  }

  async updateCriterion(
    ctx: UserContext,
    domain: AppDomain,
    input: { criterionId: string; name?: string; minScore?: number; maxScore?: number; weight?: string; displayOrder?: number },
  ): Promise<SalonTemplateDto> {
    const template = await domain.salonTemplateService.updateCriterion(ctx, input);
    return toDto(template);
  }

  async removeCriterion(
    ctx: UserContext,
    domain: AppDomain,
    criterionId: string,
  ): Promise<SalonTemplateDto> {
    const template = await domain.salonTemplateService.removeCriterion(ctx, criterionId);
    return toDto(template);
  }

  async addSlot(
    ctx: UserContext,
    domain: AppDomain,
    input: { templateId: string; name: string; maxSubmissionsPerMember?: number | null; displayOrder?: number },
  ): Promise<SalonTemplateDto> {
    const template = await domain.salonTemplateService.addSlot(ctx, input);
    return toDto(template);
  }

  async updateSlot(
    ctx: UserContext,
    domain: AppDomain,
    input: { slotId: string; name?: string; maxSubmissionsPerMember?: number | null; displayOrder?: number },
  ): Promise<SalonTemplateDto> {
    const template = await domain.salonTemplateService.updateSlot(ctx, input);
    return toDto(template);
  }

  async removeSlot(
    ctx: UserContext,
    domain: AppDomain,
    slotId: string,
  ): Promise<SalonTemplateDto> {
    const template = await domain.salonTemplateService.removeSlot(ctx, slotId);
    return toDto(template);
  }
}

export const salonTemplateController = new SalonTemplateController();
