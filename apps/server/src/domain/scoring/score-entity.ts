import { type score } from "@photo-salon/database/schema";
import { type InferSelectModel } from "drizzle-orm";
import { ScoreCriterionValueEntity } from "./score-criterion-value-entity.ts";

type ScoreModel = InferSelectModel<typeof score>;

export class ScoreEntity {
  private constructor(
    public readonly id: string,
    public readonly submissionId: string,
    public readonly judgeId: string,
    public readonly comment: string | null,
    public readonly totalScore: string | null,
    public readonly isComplete: boolean,
    public readonly completedAt: Date | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly criterionValues: ScoreCriterionValueEntity[],
  ) {}

  static create(params: {
    submissionId: string;
    judgeId: string;
  }): ScoreEntity {
    const now = new Date();
    return new ScoreEntity(
      crypto.randomUUID(),
      params.submissionId,
      params.judgeId,
      null,
      null,
      false,
      null,
      now,
      now,
      [],
    );
  }

  static fromModels(
    model: ScoreModel,
    criterionValues: Parameters<typeof ScoreCriterionValueEntity.fromModel>[0][],
  ): ScoreEntity {
    return new ScoreEntity(
      model.id,
      model.submissionId,
      model.judgeId,
      model.comment,
      model.totalScore,
      model.isComplete,
      model.completedAt,
      model.createdAt,
      model.updatedAt,
      criterionValues.map(ScoreCriterionValueEntity.fromModel),
    );
  }

  with(params: {
    comment?: string | null;
    totalScore?: string | null;
    isComplete?: boolean;
  }): ScoreEntity {
    return new ScoreEntity(
      this.id,
      this.submissionId,
      this.judgeId,
      params.comment !== undefined ? params.comment : this.comment,
      params.totalScore !== undefined ? params.totalScore : this.totalScore,
      params.isComplete ?? this.isComplete,
      params.isComplete ? new Date() : this.completedAt,
      this.createdAt,
      new Date(),
      this.criterionValues,
    );
  }
}
