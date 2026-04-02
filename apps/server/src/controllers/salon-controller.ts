import { type UserContext } from "@/lib/context.ts";
import { type AppDomain } from "@/domain/domain.ts";
import {
  type SalonDto,
  type SalonCriterionDto,
  type SalonCategoryDto,
} from "@photo-salon/contract";
import { type SalonEntity } from "@/domain/salons/salon-entity.ts";
import { type SalonScoringCriterionEntity } from "@/domain/salons/salon-scoring-criterion-entity.ts";
import { type SalonCategoryEntity } from "@/domain/salons/salon-category-entity.ts";

function criterionToDto(c: SalonScoringCriterionEntity): SalonCriterionDto {
  return {
    id: c.id,
    salonId: c.salonId,
    name: c.name,
    minScore: c.minScore,
    maxScore: c.maxScore,
    weight: c.weight,
    displayOrder: c.displayOrder,
  };
}

function categoryToDto(c: SalonCategoryEntity): SalonCategoryDto {
  return {
    id: c.id,
    salonId: c.salonId,
    name: c.name,
    maxSubmissionsPerMember: c.maxSubmissionsPerMember,
    displayOrder: c.displayOrder,
  };
}

function toDto(entity: SalonEntity): SalonDto {
  return {
    id: entity.id,
    organizationId: entity.organizationId,
    templateId: entity.templateId,
    name: entity.name,
    year: entity.year,
    month: entity.month,
    status: entity.status,
    judgeId: entity.judgeId,
    maxSubmissionsPerMember: entity.maxSubmissionsPerMember,
    slideshowRevealMode: entity.slideshowRevealMode,
    slideshowScheduledAt: entity.slideshowScheduledAt,
    slideshowStartedAt: entity.slideshowStartedAt,
    submissionsCloseAt: entity.submissionsCloseAt,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
    criteria: entity.criteria.map(criterionToDto),
    categories: entity.categories.map(categoryToDto),
  };
}

export class SalonController {
  async listSalons(
    ctx: UserContext,
    domain: AppDomain,
    input: { organizationId: string },
  ): Promise<SalonDto[]> {
    const salons = await domain.salonService.listSalons(ctx, input.organizationId);
    return salons.map(toDto);
  }

  async getSalon(
    ctx: UserContext,
    domain: AppDomain,
    salonId: string,
  ): Promise<SalonDto> {
    const salon = await domain.salonService.getSalon(ctx, salonId);
    return toDto(salon);
  }

  async createSalon(
    ctx: UserContext,
    domain: AppDomain,
    input: { organizationId: string; templateId: string; name: string; year: number; month: number },
  ): Promise<SalonDto> {
    const salon = await domain.salonService.createFromTemplate(ctx, input);
    return toDto(salon);
  }

  async updateSalon(
    ctx: UserContext,
    domain: AppDomain,
    input: { salonId: string; name?: string; judgeId?: string | null; maxSubmissionsPerMember?: number; slideshowRevealMode?: "score_after" | "score_alongside"; slideshowScheduledAt?: Date | null; submissionsCloseAt?: Date | null },
  ): Promise<SalonDto> {
    const salon = await domain.salonService.updateSalon(ctx, input);
    return toDto(salon);
  }

  async transitionSalon(
    ctx: UserContext,
    domain: AppDomain,
    input: { salonId: string; status: "open" | "judging" | "complete" },
  ): Promise<SalonDto> {
    const salon = await domain.salonService.transitionStatus(ctx, input.salonId, input.status);
    return toDto(salon);
  }

  async deleteSalon(
    ctx: UserContext,
    domain: AppDomain,
    salonId: string,
  ): Promise<{ success: boolean }> {
    await domain.salonService.deleteSalon(ctx, salonId);
    return { success: true };
  }
}

export const salonController = new SalonController();
