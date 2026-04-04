import { inject, injectable } from "inversify";
import { asc, eq, inArray } from "drizzle-orm";
import { type Database } from "@photo-salon/database";
import {
  salonTemplate,
  templateScoringCriterion,
  templateCategorySlot,
} from "@photo-salon/database/schema";
import { dbSymbol } from "@/lib/symbols.ts";
import { type UserContext } from "@/lib/context.ts";
import { SalonTemplateEntity } from "./salon-template-entity.ts";
import { TemplateScoringCriterionEntity } from "./template-scoring-criterion-entity.ts";
import { TemplateCategorySlotEntity } from "./template-category-slot-entity.ts";

@injectable()
export class SalonTemplateRepository {
  constructor(@inject(dbSymbol) private db: Database) {}

  // ── Queries ────────────────────────────────────────────────────────────────

  async findById(_ctx: UserContext, templateId: string): Promise<SalonTemplateEntity | null> {
    const rows = await this.db
      .select()
      .from(salonTemplate)
      .where(eq(salonTemplate.id, templateId))
      .limit(1);

    if (rows.length === 0) return null;
    return this.loadAggregate(rows[0].id);
  }

  async listByOrganization(
    _ctx: UserContext,
    organizationId: string,
  ): Promise<SalonTemplateEntity[]> {
    const templates = await this.db
      .select()
      .from(salonTemplate)
      .where(eq(salonTemplate.organizationId, organizationId))
      .orderBy(asc(salonTemplate.createdAt));

    if (templates.length === 0) return [];

    const ids = templates.map((t) => t.id);

    const [allCriteria, allSlots] = await Promise.all([
      this.db
        .select()
        .from(templateScoringCriterion)
        .where(inArray(templateScoringCriterion.templateId, ids))
        .orderBy(asc(templateScoringCriterion.displayOrder)),
      this.db
        .select()
        .from(templateCategorySlot)
        .where(inArray(templateCategorySlot.templateId, ids))
        .orderBy(asc(templateCategorySlot.displayOrder)),
    ]);

    return templates.map((t) =>
      SalonTemplateEntity.fromModels(
        t,
        allCriteria.filter((c) => c.templateId === t.id),
        allSlots.filter((s) => s.templateId === t.id),
      ),
    );
  }

  async findByCriterionId(
    _ctx: UserContext,
    criterionId: string,
  ): Promise<SalonTemplateEntity | null> {
    const rows = await this.db
      .select({ templateId: templateScoringCriterion.templateId })
      .from(templateScoringCriterion)
      .where(eq(templateScoringCriterion.id, criterionId))
      .limit(1);

    if (rows.length === 0) return null;
    return this.loadAggregate(rows[0].templateId);
  }

  async findBySlotId(_ctx: UserContext, slotId: string): Promise<SalonTemplateEntity | null> {
    const rows = await this.db
      .select({ templateId: templateCategorySlot.templateId })
      .from(templateCategorySlot)
      .where(eq(templateCategorySlot.id, slotId))
      .limit(1);

    if (rows.length === 0) return null;
    return this.loadAggregate(rows[0].templateId);
  }

  // ── Template save / delete ─────────────────────────────────────────────────

  async save(_ctx: UserContext, entity: SalonTemplateEntity): Promise<SalonTemplateEntity> {
    await this.db
      .insert(salonTemplate)
      .values({
        id: entity.id,
        organizationId: entity.organizationId,
        name: entity.name,
        medium: entity.medium,
        maxSubmissionsPerMember: entity.maxSubmissionsPerMember,
        slideshowRevealMode: entity.slideshowRevealMode,
        awardThreshold: entity.awardThreshold,
        createdAt: entity.createdAt,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: salonTemplate.id,
        set: {
          name: entity.name,
          medium: entity.medium,
          maxSubmissionsPerMember: entity.maxSubmissionsPerMember,
          slideshowRevealMode: entity.slideshowRevealMode,
          awardThreshold: entity.awardThreshold,
          updatedAt: new Date(),
        },
      });

    return this.loadAggregate(entity.id);
  }

  async delete(_ctx: UserContext, entity: SalonTemplateEntity): Promise<void> {
    await this.db.delete(salonTemplate).where(eq(salonTemplate.id, entity.id));
  }

  // ── Criterion save / delete ────────────────────────────────────────────────

  async saveCriterion(
    _ctx: UserContext,
    criterion: TemplateScoringCriterionEntity,
  ): Promise<TemplateScoringCriterionEntity> {
    const [row] = await this.db
      .insert(templateScoringCriterion)
      .values({
        id: criterion.id,
        templateId: criterion.templateId,
        name: criterion.name,
        minScore: criterion.minScore,
        maxScore: criterion.maxScore,
        weight: criterion.weight,
        displayOrder: criterion.displayOrder,
      })
      .onConflictDoUpdate({
        target: templateScoringCriterion.id,
        set: {
          name: criterion.name,
          minScore: criterion.minScore,
          maxScore: criterion.maxScore,
          weight: criterion.weight,
          displayOrder: criterion.displayOrder,
        },
      })
      .returning();

    return TemplateScoringCriterionEntity.fromModel(row);
  }

  async deleteCriterion(
    _ctx: UserContext,
    criterion: TemplateScoringCriterionEntity,
  ): Promise<void> {
    await this.db
      .delete(templateScoringCriterion)
      .where(eq(templateScoringCriterion.id, criterion.id));
  }

  // ── Slot save / delete ─────────────────────────────────────────────────────

  async saveSlot(
    _ctx: UserContext,
    slot: TemplateCategorySlotEntity,
  ): Promise<TemplateCategorySlotEntity> {
    const [row] = await this.db
      .insert(templateCategorySlot)
      .values({
        id: slot.id,
        templateId: slot.templateId,
        name: slot.name,
        maxSubmissionsPerMember: slot.maxSubmissionsPerMember ?? undefined,
        displayOrder: slot.displayOrder,
      })
      .onConflictDoUpdate({
        target: templateCategorySlot.id,
        set: {
          name: slot.name,
          maxSubmissionsPerMember: slot.maxSubmissionsPerMember,
          displayOrder: slot.displayOrder,
        },
      })
      .returning();

    return TemplateCategorySlotEntity.fromModel(row);
  }

  async deleteSlot(_ctx: UserContext, slot: TemplateCategorySlotEntity): Promise<void> {
    await this.db.delete(templateCategorySlot).where(eq(templateCategorySlot.id, slot.id));
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async loadAggregate(templateId: string): Promise<SalonTemplateEntity> {
    const [template, criteria, slots] = await Promise.all([
      this.db
        .select()
        .from(salonTemplate)
        .where(eq(salonTemplate.id, templateId))
        .limit(1)
        .then((rows) => rows[0]),
      this.db
        .select()
        .from(templateScoringCriterion)
        .where(eq(templateScoringCriterion.templateId, templateId))
        .orderBy(asc(templateScoringCriterion.displayOrder)),
      this.db
        .select()
        .from(templateCategorySlot)
        .where(eq(templateCategorySlot.templateId, templateId))
        .orderBy(asc(templateCategorySlot.displayOrder)),
    ]);

    if (!template) throw new Error(`SalonTemplate ${templateId} not found after write`);
    return SalonTemplateEntity.fromModels(template, criteria, slots);
  }
}
