import { type salon } from "@photo-salon/database/schema";
import { type InferSelectModel } from "drizzle-orm";
import { SalonScoringCriterionEntity } from "./salon-scoring-criterion-entity.ts";
import { SalonCategoryEntity } from "./salon-category-entity.ts";

type SalonModel = InferSelectModel<typeof salon>;

export type SalonStatus = "draft" | "open" | "judging" | "complete";

const VALID_TRANSITIONS: Record<SalonStatus, SalonStatus[]> = {
  draft: ["open"],
  open: ["draft", "judging"],
  judging: ["open", "complete"],
  complete: ["judging"],
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
    public readonly medium: "digital" | "print",
    public readonly maxSubmissionsPerMember: number,
    public readonly slideshowRevealMode: "score_after" | "score_alongside",
    public readonly awardThreshold: string | null,
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
    medium?: "digital" | "print";
    maxSubmissionsPerMember?: number;
    slideshowRevealMode?: "score_after" | "score_alongside";
    awardThreshold?: string | null;
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
      params.medium ?? "digital",
      params.maxSubmissionsPerMember ?? 3,
      params.slideshowRevealMode ?? "score_after",
      params.awardThreshold ?? null,
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
      model.medium,
      model.maxSubmissionsPerMember,
      model.slideshowRevealMode,
      model.awardThreshold,
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
    awardThreshold?: string | null;
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
      this.medium,
      params.maxSubmissionsPerMember ?? this.maxSubmissionsPerMember,
      params.slideshowRevealMode ?? this.slideshowRevealMode,
      params.awardThreshold !== undefined ? params.awardThreshold : this.awardThreshold,
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
      this.medium,
      this.maxSubmissionsPerMember,
      this.slideshowRevealMode,
      this.awardThreshold,
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
