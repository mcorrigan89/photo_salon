import { inject, injectable } from "inversify";
import { ORPCError } from "@orpc/server";
import { type UserContext } from "@/lib/context.ts";
import { SalonTemplateRepository } from "@/domain/salon-templates/salon-template-repository.ts";
import { SalonRepository } from "./salon-repository.ts";
import { SalonEntity, type SalonStatus } from "./salon-entity.ts";
import { SalonScoringCriterionEntity } from "./salon-scoring-criterion-entity.ts";
import { SalonCategoryEntity } from "./salon-category-entity.ts";

@injectable()
export class SalonService {
  constructor(
    @inject(SalonRepository) private repo: SalonRepository,
    @inject(SalonTemplateRepository) private templateRepo: SalonTemplateRepository,
  ) {}

  async listSalons(ctx: UserContext, organizationId: string): Promise<SalonEntity[]> {
    return this.repo.listByOrganization(ctx, organizationId);
  }

  async getSalon(ctx: UserContext, salonId: string): Promise<SalonEntity> {
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
    const template = await this.templateRepo.findById(ctx, params.templateId);
    if (!template) {
      throw new ORPCError("NOT_FOUND", { message: "Template not found." });
    }

    // Create the salon shell with settings copied from the template
    const salonEntity = SalonEntity.create({
      organizationId: params.organizationId,
      templateId: params.templateId,
      name: params.name,
      year: params.year,
      month: params.month,
      maxSubmissionsPerMember: template.maxSubmissionsPerMember,
      slideshowRevealMode: template.slideshowRevealMode,
    });

    const saved = await this.repo.save(ctx, salonEntity);

    // Snapshot criteria from the template (immutable after creation)
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

    // Snapshot category slots from the template
    const categories = template.slots.map((s) =>
      SalonCategoryEntity.create({
        salonId: saved.id,
        name: s.name,
        maxSubmissionsPerMember: s.maxSubmissionsPerMember,
        displayOrder: s.displayOrder,
      }),
    );
    await this.repo.saveCategories(ctx, categories);

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

    if (!existing.canTransitionTo(newStatus)) {
      throw new ORPCError("BAD_REQUEST", {
        message: `Cannot transition from "${existing.status}" to "${newStatus}".`,
      });
    }

    return this.repo.save(ctx, existing.transitionTo(newStatus));
  }

  // ── Categories ──────────────────────────────────────────────────────────

  async addCategory(
    ctx: UserContext,
    params: { salonId: string; name: string; maxSubmissionsPerMember?: number | null; displayOrder?: number },
  ): Promise<SalonEntity> {
    const salon = await this.requireDraft(ctx, params.salonId);
    await this.repo.saveCategory(ctx, SalonCategoryEntity.create(params));
    return this.repo.findById(ctx, salon.id) as Promise<SalonEntity>;
  }

  async updateCategory(
    ctx: UserContext,
    params: { categoryId: string; name?: string; maxSubmissionsPerMember?: number | null; displayOrder?: number },
  ): Promise<SalonEntity> {
    const { categoryId, ...updates } = params;
    const salon = await this.findSalonByCategoryId(ctx, categoryId);
    this.requireDraftStatus(salon);
    const category = salon.categories.find((c) => c.id === categoryId)!;
    await this.repo.saveCategory(ctx, category.with(updates));
    return this.repo.findById(ctx, salon.id) as Promise<SalonEntity>;
  }

  async removeCategory(ctx: UserContext, categoryId: string): Promise<SalonEntity> {
    const salon = await this.findSalonByCategoryId(ctx, categoryId);
    this.requireDraftStatus(salon);
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
    const existing = await this.repo.findById(ctx, salonId);
    if (!existing) throw new ORPCError("NOT_FOUND", { message: "Salon not found." });

    if (existing.status !== "draft") {
      throw new ORPCError("BAD_REQUEST", {
        message: "Only draft salons can be deleted.",
      });
    }

    await this.repo.delete(ctx, existing);
  }
}
