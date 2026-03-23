import { type salonTemplate } from "@photo-salon/database/schema";
import { type InferSelectModel } from "drizzle-orm";
import { TemplateScoringCriterionEntity } from "./template-scoring-criterion-entity.ts";
import { TemplateCategorySlotEntity } from "./template-category-slot-entity.ts";

type SalonTemplateModel = InferSelectModel<typeof salonTemplate>;

export class SalonTemplateEntity {
  private constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly name: string,
    public readonly maxSubmissionsPerMember: number,
    public readonly slideshowRevealMode: "score_after" | "score_alongside",
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    /** Ordered by displayOrder ascending. */
    public readonly criteria: TemplateScoringCriterionEntity[],
    /** Ordered by displayOrder ascending. */
    public readonly slots: TemplateCategorySlotEntity[],
  ) {}

  static create(params: {
    organizationId: string;
    name: string;
    maxSubmissionsPerMember?: number;
    slideshowRevealMode?: "score_after" | "score_alongside";
  }): SalonTemplateEntity {
    const now = new Date();
    return new SalonTemplateEntity(
      crypto.randomUUID(),
      params.organizationId,
      params.name,
      params.maxSubmissionsPerMember ?? 3,
      params.slideshowRevealMode ?? "score_after",
      now,
      now,
      [],
      [],
    );
  }

  static fromModels(
    template: SalonTemplateModel,
    criteria: Parameters<typeof TemplateScoringCriterionEntity.fromModel>[0][],
    slots: Parameters<typeof TemplateCategorySlotEntity.fromModel>[0][],
  ): SalonTemplateEntity {
    return new SalonTemplateEntity(
      template.id,
      template.organizationId,
      template.name,
      template.maxSubmissionsPerMember,
      template.slideshowRevealMode,
      template.createdAt,
      template.updatedAt,
      criteria.map(TemplateScoringCriterionEntity.fromModel),
      slots.map(TemplateCategorySlotEntity.fromModel),
    );
  }

  with(params: {
    name?: string;
    maxSubmissionsPerMember?: number;
    slideshowRevealMode?: "score_after" | "score_alongside";
  }): SalonTemplateEntity {
    return new SalonTemplateEntity(
      this.id,
      this.organizationId,
      params.name ?? this.name,
      params.maxSubmissionsPerMember ?? this.maxSubmissionsPerMember,
      params.slideshowRevealMode ?? this.slideshowRevealMode,
      this.createdAt,
      new Date(),
      this.criteria,
      this.slots,
    );
  }
}
