import { type salon } from "@photo-salon/database/schema";
import { type InferSelectModel } from "drizzle-orm";
import { SalonScoringCriterionEntity } from "./salon-scoring-criterion-entity.ts";
import { SalonCategoryEntity } from "./salon-category-entity.ts";

type SalonModel = InferSelectModel<typeof salon>;

export type SalonStatus = "draft" | "open" | "judging" | "complete";

const VALID_TRANSITIONS: Record<SalonStatus, SalonStatus[]> = {
  draft: ["open"],
  open: ["judging"],
  judging: ["complete"],
  complete: [],
};

export class SalonEntity {
  private constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly templateId: string | null,
    public readonly name: string,
    public readonly year: number,
    public readonly month: number,
    public readonly status: SalonStatus,
    public readonly judgeId: string | null,
    public readonly maxSubmissionsPerMember: number,
    public readonly slideshowRevealMode: "score_after" | "score_alongside",
    public readonly slideshowScheduledAt: Date | null,
    public readonly slideshowStartedAt: Date | null,
    public readonly submissionsCloseAt: Date | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    /** Immutable after creation. Ordered by displayOrder ascending. */
    public readonly criteria: SalonScoringCriterionEntity[],
    /** Ordered by displayOrder ascending. */
    public readonly categories: SalonCategoryEntity[],
  ) {}

  static create(params: {
    organizationId: string;
    templateId: string | null;
    name: string;
    year: number;
    month: number;
    maxSubmissionsPerMember?: number;
    slideshowRevealMode?: "score_after" | "score_alongside";
  }): SalonEntity {
    const now = new Date();
    return new SalonEntity(
      crypto.randomUUID(),
      params.organizationId,
      params.templateId,
      params.name,
      params.year,
      params.month,
      "draft",
      null,
      params.maxSubmissionsPerMember ?? 3,
      params.slideshowRevealMode ?? "score_after",
      null,
      null,
      null,
      now,
      now,
      [],
      [],
    );
  }

  static fromModels(
    model: SalonModel,
    criteria: Parameters<typeof SalonScoringCriterionEntity.fromModel>[0][],
    categories: Parameters<typeof SalonCategoryEntity.fromModel>[0][],
  ): SalonEntity {
    return new SalonEntity(
      model.id,
      model.organizationId,
      model.templateId,
      model.name,
      model.year,
      model.month,
      model.status,
      model.judgeId,
      model.maxSubmissionsPerMember,
      model.slideshowRevealMode,
      model.slideshowScheduledAt,
      model.slideshowStartedAt,
      model.submissionsCloseAt,
      model.createdAt,
      model.updatedAt,
      criteria.map(SalonScoringCriterionEntity.fromModel),
      categories.map(SalonCategoryEntity.fromModel),
    );
  }

  with(params: {
    name?: string;
    judgeId?: string | null;
    maxSubmissionsPerMember?: number;
    slideshowRevealMode?: "score_after" | "score_alongside";
    slideshowScheduledAt?: Date | null;
    submissionsCloseAt?: Date | null;
  }): SalonEntity {
    return new SalonEntity(
      this.id,
      this.organizationId,
      this.templateId,
      params.name ?? this.name,
      this.year,
      this.month,
      this.status,
      params.judgeId !== undefined ? params.judgeId : this.judgeId,
      params.maxSubmissionsPerMember ?? this.maxSubmissionsPerMember,
      params.slideshowRevealMode ?? this.slideshowRevealMode,
      params.slideshowScheduledAt !== undefined ? params.slideshowScheduledAt : this.slideshowScheduledAt,
      this.slideshowStartedAt,
      params.submissionsCloseAt !== undefined ? params.submissionsCloseAt : this.submissionsCloseAt,
      this.createdAt,
      new Date(),
      this.criteria,
      this.categories,
    );
  }

  /** Returns whether the given status transition is valid. */
  canTransitionTo(next: SalonStatus): boolean {
    return VALID_TRANSITIONS[this.status].includes(next);
  }

  /** Returns a new entity with the status transitioned. Throws if invalid. */
  transitionTo(next: SalonStatus): SalonEntity {
    if (!this.canTransitionTo(next)) {
      throw new Error(`Cannot transition salon from "${this.status}" to "${next}".`);
    }
    return new SalonEntity(
      this.id,
      this.organizationId,
      this.templateId,
      this.name,
      this.year,
      this.month,
      next,
      this.judgeId,
      this.maxSubmissionsPerMember,
      this.slideshowRevealMode,
      this.slideshowScheduledAt,
      this.slideshowStartedAt,
      this.submissionsCloseAt,
      this.createdAt,
      new Date(),
      this.criteria,
      this.categories,
    );
  }
}
