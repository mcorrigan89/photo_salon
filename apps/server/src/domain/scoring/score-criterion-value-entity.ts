import { type scoreCriterionValue } from "@photo-salon/database/schema";
import { type InferSelectModel } from "drizzle-orm";

type ScoreCriterionValueModel = InferSelectModel<typeof scoreCriterionValue>;

export class ScoreCriterionValueEntity {
  private constructor(
    public readonly id: string,
    public readonly scoreId: string,
    public readonly salonScoringCriterionId: string,
    public readonly value: string,
  ) {}

  static create(params: {
    scoreId: string;
    salonScoringCriterionId: string;
    value: string;
  }): ScoreCriterionValueEntity {
    return new ScoreCriterionValueEntity(
      crypto.randomUUID(),
      params.scoreId,
      params.salonScoringCriterionId,
      params.value,
    );
  }

  static fromModel(row: ScoreCriterionValueModel): ScoreCriterionValueEntity {
    return new ScoreCriterionValueEntity(
      row.id,
      row.scoreId,
      row.salonScoringCriterionId,
      row.value,
    );
  }

  with(params: { value?: string }): ScoreCriterionValueEntity {
    return new ScoreCriterionValueEntity(
      this.id,
      this.scoreId,
      this.salonScoringCriterionId,
      params.value ?? this.value,
    );
  }
}
