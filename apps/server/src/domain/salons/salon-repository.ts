import { inject, injectable } from "inversify";
import { asc, eq, inArray } from "drizzle-orm";
import { type Database } from "@photo-salon/database";
import {
  salon,
  salonScoringCriterion,
  salonCategory,
} from "@photo-salon/database/schema";
import { dbSymbol } from "@/lib/symbols.ts";
import { type UserContext } from "@/lib/context.ts";
import { SalonEntity } from "./salon-entity.ts";
import { SalonScoringCriterionEntity } from "./salon-scoring-criterion-entity.ts";
import { SalonCategoryEntity } from "./salon-category-entity.ts";

@injectable()
export class SalonRepository {
  constructor(@inject(dbSymbol) private db: Database) {}

  // ── Queries ────────────────────────────────────────────────────────────────

  async findById(_ctx: UserContext, salonId: string): Promise<SalonEntity | null> {
    const rows = await this.db
      .select()
      .from(salon)
      .where(eq(salon.id, salonId))
      .limit(1);

    if (rows.length === 0) return null;
    return this.loadAggregate(rows[0].id);
  }

  async listByOrganization(
    _ctx: UserContext,
    organizationId: string,
  ): Promise<SalonEntity[]> {
    const salons = await this.db
      .select()
      .from(salon)
      .where(eq(salon.organizationId, organizationId))
      .orderBy(asc(salon.year), asc(salon.month));

    if (salons.length === 0) return [];

    const ids = salons.map((s) => s.id);

    const [allCriteria, allCategories] = await Promise.all([
      this.db
        .select()
        .from(salonScoringCriterion)
        .where(inArray(salonScoringCriterion.salonId, ids))
        .orderBy(asc(salonScoringCriterion.displayOrder)),
      this.db
        .select()
        .from(salonCategory)
        .where(inArray(salonCategory.salonId, ids))
        .orderBy(asc(salonCategory.displayOrder)),
    ]);

    return salons.map((s) =>
      SalonEntity.fromModels(
        s,
        allCriteria.filter((c) => c.salonId === s.id),
        allCategories.filter((cat) => cat.salonId === s.id),
      ),
    );
  }

  async findByCategoryId(_ctx: UserContext, categoryId: string): Promise<SalonEntity | null> {
    const rows = await this.db
      .select({ salonId: salonCategory.salonId })
      .from(salonCategory)
      .where(eq(salonCategory.id, categoryId))
      .limit(1);

    if (rows.length === 0) return null;
    return this.loadAggregate(rows[0].salonId);
  }

  // ── Salon save / delete ────────────────────────────────────────────────────

  async save(_ctx: UserContext, entity: SalonEntity): Promise<SalonEntity> {
    await this.db
      .insert(salon)
      .values({
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
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: salon.id,
        set: {
          name: entity.name,
          status: entity.status,
          judgeId: entity.judgeId,
          maxSubmissionsPerMember: entity.maxSubmissionsPerMember,
          slideshowRevealMode: entity.slideshowRevealMode,
          slideshowScheduledAt: entity.slideshowScheduledAt,
          slideshowStartedAt: entity.slideshowStartedAt,
          submissionsCloseAt: entity.submissionsCloseAt,
          updatedAt: new Date(),
        },
      });

    return this.loadAggregate(entity.id);
  }

  async delete(_ctx: UserContext, entity: SalonEntity): Promise<void> {
    await this.db.delete(salon).where(eq(salon.id, entity.id));
  }

  // ── Criterion save (batch for createFromTemplate) ──────────────────────────

  async saveCriteria(
    _ctx: UserContext,
    criteria: SalonScoringCriterionEntity[],
  ): Promise<void> {
    if (criteria.length === 0) return;
    await this.db.insert(salonScoringCriterion).values(
      criteria.map((c) => ({
        id: c.id,
        salonId: c.salonId,
        name: c.name,
        minScore: c.minScore,
        maxScore: c.maxScore,
        weight: c.weight,
        displayOrder: c.displayOrder,
      })),
    );
  }

  async saveCriterion(
    _ctx: UserContext,
    criterion: SalonScoringCriterionEntity,
  ): Promise<SalonScoringCriterionEntity> {
    const [row] = await this.db
      .insert(salonScoringCriterion)
      .values({
        id: criterion.id,
        salonId: criterion.salonId,
        name: criterion.name,
        minScore: criterion.minScore,
        maxScore: criterion.maxScore,
        weight: criterion.weight,
        displayOrder: criterion.displayOrder,
      })
      .onConflictDoUpdate({
        target: salonScoringCriterion.id,
        set: {
          name: criterion.name,
          minScore: criterion.minScore,
          maxScore: criterion.maxScore,
          weight: criterion.weight,
          displayOrder: criterion.displayOrder,
        },
      })
      .returning();

    return SalonScoringCriterionEntity.fromModel(row);
  }

  async deleteCriterion(_ctx: UserContext, criterion: SalonScoringCriterionEntity): Promise<void> {
    await this.db.delete(salonScoringCriterion).where(eq(salonScoringCriterion.id, criterion.id));
  }

  async findByCriterionId(_ctx: UserContext, criterionId: string): Promise<SalonEntity | null> {
    const rows = await this.db
      .select({ salonId: salonScoringCriterion.salonId })
      .from(salonScoringCriterion)
      .where(eq(salonScoringCriterion.id, criterionId))
      .limit(1);

    if (rows.length === 0) return null;
    return this.loadAggregate(rows[0].salonId);
  }

  // ── Category save / delete ─────────────────────────────────────────────────

  async saveCategory(
    _ctx: UserContext,
    category: SalonCategoryEntity,
  ): Promise<SalonCategoryEntity> {
    const [row] = await this.db
      .insert(salonCategory)
      .values({
        id: category.id,
        salonId: category.salonId,
        name: category.name,
        maxSubmissionsPerMember: category.maxSubmissionsPerMember ?? undefined,
        displayOrder: category.displayOrder,
      })
      .onConflictDoUpdate({
        target: salonCategory.id,
        set: {
          name: category.name,
          maxSubmissionsPerMember: category.maxSubmissionsPerMember,
          displayOrder: category.displayOrder,
        },
      })
      .returning();

    return SalonCategoryEntity.fromModel(row);
  }

  async saveCategories(
    _ctx: UserContext,
    categories: SalonCategoryEntity[],
  ): Promise<void> {
    if (categories.length === 0) return;
    await this.db.insert(salonCategory).values(
      categories.map((c) => ({
        id: c.id,
        salonId: c.salonId,
        name: c.name,
        maxSubmissionsPerMember: c.maxSubmissionsPerMember ?? undefined,
        displayOrder: c.displayOrder,
      })),
    );
  }

  async deleteCategory(_ctx: UserContext, category: SalonCategoryEntity): Promise<void> {
    await this.db.delete(salonCategory).where(eq(salonCategory.id, category.id));
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async loadAggregate(salonId: string): Promise<SalonEntity> {
    const [salonRow, criteria, categories] = await Promise.all([
      this.db
        .select()
        .from(salon)
        .where(eq(salon.id, salonId))
        .limit(1)
        .then((rows) => rows[0]),
      this.db
        .select()
        .from(salonScoringCriterion)
        .where(eq(salonScoringCriterion.salonId, salonId))
        .orderBy(asc(salonScoringCriterion.displayOrder)),
      this.db
        .select()
        .from(salonCategory)
        .where(eq(salonCategory.salonId, salonId))
        .orderBy(asc(salonCategory.displayOrder)),
    ]);

    if (!salonRow) throw new Error(`Salon ${salonId} not found after write`);
    return SalonEntity.fromModels(salonRow, criteria, categories);
  }
}
