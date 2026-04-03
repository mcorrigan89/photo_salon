import { inject, injectable } from "inversify";
import { ORPCError } from "@orpc/server";
import { type UserContext } from "@/lib/context.ts";
import { SalonTemplateRepository } from "./salon-template-repository.ts";
import { SalonTemplateEntity } from "./salon-template-entity.ts";
import { TemplateScoringCriterionEntity } from "./template-scoring-criterion-entity.ts";
import { TemplateCategorySlotEntity } from "./template-category-slot-entity.ts";

@injectable()
export class SalonTemplateService {
  constructor(@inject(SalonTemplateRepository) private repo: SalonTemplateRepository) {}

  async listTemplates(ctx: UserContext, organizationId: string): Promise<SalonTemplateEntity[]> {
    ctx.logger.trace("Listing templates", organizationId);
    return this.repo.listByOrganization(ctx, organizationId);
  }

  async getTemplate(ctx: UserContext, templateId: string): Promise<SalonTemplateEntity> {
    ctx.logger.trace("Getting template", templateId);
    const template = await this.repo.findById(ctx, templateId);
    if (!template) throw new ORPCError("NOT_FOUND", { message: "Template not found." });
    return template;
  }

  async createTemplate(
    ctx: UserContext,
    params: {
      organizationId: string;
      name: string;
      maxSubmissionsPerMember?: number;
      slideshowRevealMode?: "score_after" | "score_alongside";
    },
  ): Promise<SalonTemplateEntity> {
    ctx.logger.info("Creating template", params.name, params.organizationId);
    const result = await this.repo.save(ctx, SalonTemplateEntity.create(params));
    ctx.logger.info("Template created", result.id);
    return result;
  }

  async updateTemplate(
    ctx: UserContext,
    params: {
      templateId: string;
      name?: string;
      maxSubmissionsPerMember?: number;
      slideshowRevealMode?: "score_after" | "score_alongside";
    },
  ): Promise<SalonTemplateEntity> {
    ctx.logger.info("Updating template", params.templateId);
    const template = await this.repo.findById(ctx, params.templateId);
    if (!template) throw new ORPCError("NOT_FOUND", { message: "Template not found." });
    return this.repo.save(ctx, template.with(params));
  }

  async deleteTemplate(ctx: UserContext, templateId: string): Promise<void> {
    ctx.logger.info("Deleting template", templateId);
    const template = await this.repo.findById(ctx, templateId);
    if (!template) throw new ORPCError("NOT_FOUND", { message: "Template not found." });
    await this.repo.delete(ctx, template);
    ctx.logger.info("Template deleted", templateId);
  }

  // ── Criteria ───────────────────────────────────────────────────────────────

  async addCriterion(
    ctx: UserContext,
    params: {
      templateId: string;
      name: string;
      minScore?: number;
      maxScore?: number;
      weight?: string;
      displayOrder?: number;
    },
  ): Promise<SalonTemplateEntity> {
    ctx.logger.info("Adding criterion to template", params.templateId, params.name);
    const template = await this.repo.findById(ctx, params.templateId);
    if (!template) throw new ORPCError("NOT_FOUND", { message: "Template not found." });
    await this.repo.saveCriterion(ctx, TemplateScoringCriterionEntity.create(params));
    return this.repo.findById(ctx, params.templateId) as Promise<SalonTemplateEntity>;
  }

  async updateCriterion(
    ctx: UserContext,
    params: {
      criterionId: string;
      name?: string;
      minScore?: number;
      maxScore?: number;
      weight?: string;
      displayOrder?: number;
    },
  ): Promise<SalonTemplateEntity> {
    ctx.logger.info("Updating criterion", params.criterionId);
    const { criterionId, ...updates } = params;
    const template = await this.findTemplateByCriterionId(ctx, criterionId);
    const criterion = template.criteria.find((c) => c.id === criterionId)!;
    await this.repo.saveCriterion(ctx, criterion.with(updates));
    return this.repo.findById(ctx, template.id) as Promise<SalonTemplateEntity>;
  }

  async removeCriterion(ctx: UserContext, criterionId: string): Promise<SalonTemplateEntity> {
    ctx.logger.info("Removing criterion", criterionId);
    const template = await this.findTemplateByCriterionId(ctx, criterionId);
    const criterion = template.criteria.find((c) => c.id === criterionId)!;
    await this.repo.deleteCriterion(ctx, criterion);
    return this.repo.findById(ctx, template.id) as Promise<SalonTemplateEntity>;
  }

  // ── Slots ──────────────────────────────────────────────────────────────────

  async addSlot(
    ctx: UserContext,
    params: {
      templateId: string;
      name: string;
      maxSubmissionsPerMember?: number | null;
      displayOrder?: number;
    },
  ): Promise<SalonTemplateEntity> {
    ctx.logger.info("Adding slot to template", params.templateId, params.name);
    const template = await this.repo.findById(ctx, params.templateId);
    if (!template) throw new ORPCError("NOT_FOUND", { message: "Template not found." });
    await this.repo.saveSlot(ctx, TemplateCategorySlotEntity.create(params));
    return this.repo.findById(ctx, params.templateId) as Promise<SalonTemplateEntity>;
  }

  async updateSlot(
    ctx: UserContext,
    params: {
      slotId: string;
      name?: string;
      maxSubmissionsPerMember?: number | null;
      displayOrder?: number;
    },
  ): Promise<SalonTemplateEntity> {
    ctx.logger.info("Updating slot", params.slotId);
    const { slotId, ...updates } = params;
    const template = await this.findTemplateBySlotId(ctx, slotId);
    const slot = template.slots.find((s) => s.id === slotId)!;
    await this.repo.saveSlot(ctx, slot.with(updates));
    return this.repo.findById(ctx, template.id) as Promise<SalonTemplateEntity>;
  }

  async removeSlot(ctx: UserContext, slotId: string): Promise<SalonTemplateEntity> {
    ctx.logger.info("Removing slot", slotId);
    const template = await this.findTemplateBySlotId(ctx, slotId);
    const slot = template.slots.find((s) => s.id === slotId)!;
    await this.repo.deleteSlot(ctx, slot);
    return this.repo.findById(ctx, template.id) as Promise<SalonTemplateEntity>;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async findTemplateByCriterionId(
    ctx: UserContext,
    criterionId: string,
  ): Promise<SalonTemplateEntity> {
    const template = await this.repo.findByCriterionId(ctx, criterionId);
    if (!template) throw new ORPCError("NOT_FOUND", { message: "Criterion not found." });
    return template;
  }

  private async findTemplateBySlotId(
    ctx: UserContext,
    slotId: string,
  ): Promise<SalonTemplateEntity> {
    const template = await this.repo.findBySlotId(ctx, slotId);
    if (!template) throw new ORPCError("NOT_FOUND", { message: "Slot not found." });
    return template;
  }
}
