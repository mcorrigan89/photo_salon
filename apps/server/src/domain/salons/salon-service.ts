import { inject, injectable } from "inversify";
import { ORPCError } from "@orpc/server";
import { type UserContext } from "@/lib/context.ts";
import { SalonTemplateRepository } from "@/domain/salon-templates/salon-template-repository.ts";
import { SalonRepository } from "./salon-repository.ts";
import { SubmissionRepository } from "@/domain/submissions/submission-repository.ts";
import { SalonEntity, type SalonStatus } from "./salon-entity.ts";
import { SalonScoringCriterionEntity } from "./salon-scoring-criterion-entity.ts";
import { SalonCategoryEntity } from "./salon-category-entity.ts";

@injectable()
export class SalonService {
  constructor(
    @inject(SalonRepository) private repo: SalonRepository,
    @inject(SalonTemplateRepository) private templateRepo: SalonTemplateRepository,
    @inject(SubmissionRepository) private submissionRepo: SubmissionRepository,
  ) {}

  async listSalons(ctx: UserContext, organizationId: string): Promise<SalonEntity[]> {
    ctx.logger.trace("Listing salons", organizationId);
    return this.repo.listByOrganization(ctx, organizationId);
  }

  async getSalon(ctx: UserContext, salonId: string): Promise<SalonEntity> {
    ctx.logger.trace("Getting salon", salonId);
    const salon = await this.repo.findById(ctx, salonId);
    if (!salon) throw new ORPCError("NOT_FOUND", { message: "Salon not found." });
    return salon;
  }

  async createFromTemplate(
    ctx: UserContext,
    params: {
      organizationId: string;
      templateId: string;
      name: string;
      year: number;
      month: number;
    },
  ): Promise<SalonEntity> {
    ctx.logger.info("Creating salon from template", params.templateId, params.name, `${params.year}/${params.month}`);

    const template = await this.templateRepo.findById(ctx, params.templateId);
    if (!template) {
      throw new ORPCError("NOT_FOUND", { message: "Template not found." });
    }

    const salonEntity = SalonEntity.create({
      organizationId: params.organizationId,
      templateId: params.templateId,
      name: params.name,
      year: params.year,
      month: params.month,
      medium: template.medium,
      maxSubmissionsPerMember: template.maxSubmissionsPerMember,
      slideshowRevealMode: template.slideshowRevealMode,
      awardThreshold: template.awardThreshold,
    });

    const saved = await this.repo.save(ctx, salonEntity);
    ctx.logger.info("Salon created", saved.id);

    const criteria = template.criteria.map((c) =>
      SalonScoringCriterionEntity.create({
        salonId: saved.id,
        name: c.name,
        minScore: c.minScore,
        maxScore: c.maxScore,
        weight: c.weight,
        displayOrder: c.displayOrder,
      }),
    );
    await this.repo.saveCriteria(ctx, criteria);
    ctx.logger.info("Snapshotted criteria", criteria.length);

    const categories = template.slots.map((s) =>
      SalonCategoryEntity.create({
        salonId: saved.id,
        name: s.name,
        maxSubmissionsPerMember: s.maxSubmissionsPerMember,
        displayOrder: s.displayOrder,
      }),
    );
    await this.repo.saveCategories(ctx, categories);
    ctx.logger.info("Snapshotted categories", categories.length);

    return this.repo.findById(ctx, saved.id) as Promise<SalonEntity>;
  }

  async updateSalon(
    ctx: UserContext,
    params: {
      salonId: string;
      name?: string;
      judgeId?: string | null;
      maxSubmissionsPerMember?: number;
      slideshowRevealMode?: "score_after" | "score_alongside";
      slideshowScheduledAt?: Date | null;
      submissionsCloseAt?: Date | null;
    },
  ): Promise<SalonEntity> {
    ctx.logger.info("Updating salon", params.salonId);
    const existing = await this.repo.findById(ctx, params.salonId);
    if (!existing) throw new ORPCError("NOT_FOUND", { message: "Salon not found." });
    return this.repo.save(ctx, existing.with(params));
  }

  async transitionStatus(
    ctx: UserContext,
    salonId: string,
    newStatus: SalonStatus,
  ): Promise<SalonEntity> {
    const existing = await this.repo.findById(ctx, salonId);
    if (!existing) throw new ORPCError("NOT_FOUND", { message: "Salon not found." });

    ctx.logger.info("Transitioning salon", salonId, `${existing.status} → ${newStatus}`);

    if (!existing.canTransitionTo(newStatus)) {
      ctx.logger.warn("Invalid salon transition", salonId, `${existing.status} → ${newStatus}`);
      throw new ORPCError("BAD_REQUEST", {
        message: `Cannot transition from "${existing.status}" to "${newStatus}".`,
      });
    }

    const result = await this.repo.save(ctx, existing.transitionTo(newStatus));
    ctx.logger.info("Salon transitioned", salonId, newStatus);
    return result;
  }

  // ── Criteria ────────────────────────────────────────────────────────────

  async addCriterion(
    ctx: UserContext,
    params: { salonId: string; name: string; minScore: number; maxScore: number; weight: string; displayOrder?: number },
  ): Promise<SalonEntity> {
    ctx.logger.info("Adding criterion to salon", params.salonId, params.name);
    const salon = await this.requireDraft(ctx, params.salonId);
    await this.repo.saveCriterion(ctx, SalonScoringCriterionEntity.create({ ...params, displayOrder: params.displayOrder ?? salon.criteria.length }));
    return this.repo.findById(ctx, salon.id) as Promise<SalonEntity>;
  }

  async updateCriterion(
    ctx: UserContext,
    params: { criterionId: string; name?: string; minScore?: number; maxScore?: number; weight?: string; displayOrder?: number },
  ): Promise<SalonEntity> {
    ctx.logger.info("Updating salon criterion", params.criterionId);
    const { criterionId, ...updates } = params;
    const salon = await this.findSalonByCriterionId(ctx, criterionId);
    this.requireDraftStatus(salon);
    const criterion = salon.criteria.find((c) => c.id === criterionId)!;
    await this.repo.saveCriterion(ctx, criterion.with(updates));
    return this.repo.findById(ctx, salon.id) as Promise<SalonEntity>;
  }

  async removeCriterion(ctx: UserContext, criterionId: string): Promise<SalonEntity> {
    ctx.logger.info("Removing salon criterion", criterionId);
    const salon = await this.findSalonByCriterionId(ctx, criterionId);
    this.requireDraftStatus(salon);
    const criterion = salon.criteria.find((c) => c.id === criterionId)!;
    await this.repo.deleteCriterion(ctx, criterion);
    return this.repo.findById(ctx, salon.id) as Promise<SalonEntity>;
  }

  private async findSalonByCriterionId(ctx: UserContext, criterionId: string): Promise<SalonEntity> {
    const salon = await this.repo.findByCriterionId(ctx, criterionId);
    if (!salon) throw new ORPCError("NOT_FOUND", { message: "Criterion not found." });
    return salon;
  }

  // ── Categories ──────────────────────────────────────────────────────────

  async addCategory(
    ctx: UserContext,
    params: { salonId: string; name: string; maxSubmissionsPerMember?: number | null; displayOrder?: number },
  ): Promise<SalonEntity> {
    ctx.logger.info("Adding category to salon", params.salonId, params.name);
    const salon = await this.requireDraft(ctx, params.salonId);
    await this.repo.saveCategory(ctx, SalonCategoryEntity.create(params));
    return this.repo.findById(ctx, salon.id) as Promise<SalonEntity>;
  }

  async updateCategory(
    ctx: UserContext,
    params: { categoryId: string; name?: string; maxSubmissionsPerMember?: number | null; displayOrder?: number },
  ): Promise<SalonEntity> {
    ctx.logger.info("Updating category", params.categoryId);
    const { categoryId, ...updates } = params;
    const salon = await this.findSalonByCategoryId(ctx, categoryId);
    this.requireDraftStatus(salon);
    const category = salon.categories.find((c) => c.id === categoryId)!;
    await this.repo.saveCategory(ctx, category.with(updates));
    return this.repo.findById(ctx, salon.id) as Promise<SalonEntity>;
  }

  async removeCategory(ctx: UserContext, categoryId: string): Promise<SalonEntity> {
    ctx.logger.info("Removing category", categoryId);
    const salon = await this.findSalonByCategoryId(ctx, categoryId);
    this.requireDraftStatus(salon);

    const hasSubmissions = await this.submissionRepo.hasSubmissionsForCategory(ctx, categoryId);
    if (hasSubmissions) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Cannot delete a category that has submissions. Withdraw or remove submissions first.",
      });
    }

    const category = salon.categories.find((c) => c.id === categoryId)!;
    await this.repo.deleteCategory(ctx, category);
    return this.repo.findById(ctx, salon.id) as Promise<SalonEntity>;
  }

  private async requireDraft(ctx: UserContext, salonId: string): Promise<SalonEntity> {
    const salon = await this.repo.findById(ctx, salonId);
    if (!salon) throw new ORPCError("NOT_FOUND", { message: "Salon not found." });
    this.requireDraftStatus(salon);
    return salon;
  }

  private requireDraftStatus(salon: SalonEntity): void {
    if (salon.status !== "draft") {
      throw new ORPCError("BAD_REQUEST", { message: "Categories can only be modified in draft." });
    }
  }

  private async findSalonByCategoryId(ctx: UserContext, categoryId: string): Promise<SalonEntity> {
    const salon = await this.repo.findByCategoryId(ctx, categoryId);
    if (!salon) throw new ORPCError("NOT_FOUND", { message: "Category not found." });
    return salon;
  }

  async deleteSalon(ctx: UserContext, salonId: string): Promise<void> {
    ctx.logger.info("Deleting salon", salonId);
    const existing = await this.repo.findById(ctx, salonId);
    if (!existing) throw new ORPCError("NOT_FOUND", { message: "Salon not found." });

    if (existing.status !== "draft") {
      throw new ORPCError("BAD_REQUEST", { message: "Only draft salons can be deleted." });
    }

    const hasSubmissions = await this.submissionRepo.hasSubmissionsForSalon(ctx, salonId);
    if (hasSubmissions) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Cannot delete a salon that has submissions.",
      });
    }

    await this.repo.delete(ctx, existing);
    ctx.logger.info("Salon deleted", salonId);
  }
}
