import { type templateScoringCriterion } from "@photo-salon/database/schema";
import { type InferSelectModel } from "drizzle-orm";

type TemplateScoringCriterionModel = InferSelectModel<typeof templateScoringCriterion>;

export class TemplateScoringCriterionEntity {
  private constructor(
    public readonly id: string,
    public readonly templateId: string,
    public readonly name: string,
    public readonly minScore: number,
    public readonly maxScore: number,
    /** Decimal string, e.g. "1.50". Kept as string to avoid float precision loss. */
    public readonly weight: string,
    public readonly displayOrder: number,
  ) {}

  static create(params: {
    templateId: string;
    name: string;
    minScore?: number;
    maxScore?: number;
    weight?: string;
    displayOrder?: number;
  }): TemplateScoringCriterionEntity {
    return new TemplateScoringCriterionEntity(
      crypto.randomUUID(),
      params.templateId,
      params.name,
      params.minScore ?? 1,
      params.maxScore ?? 10,
      params.weight ?? "1.00",
      params.displayOrder ?? 0,
    );
  }

  static fromModel(row: TemplateScoringCriterionModel): TemplateScoringCriterionEntity {
    return new TemplateScoringCriterionEntity(
      row.id,
      row.templateId,
      row.name,
      row.minScore,
      row.maxScore,
      row.weight,
      row.displayOrder,
    );
  }

  with(params: {
    name?: string;
    minScore?: number;
    maxScore?: number;
    weight?: string;
    displayOrder?: number;
  }): TemplateScoringCriterionEntity {
    return new TemplateScoringCriterionEntity(
      this.id,
      this.templateId,
      params.name ?? this.name,
      params.minScore ?? this.minScore,
      params.maxScore ?? this.maxScore,
      params.weight ?? this.weight,
      params.displayOrder ?? this.displayOrder,
    );
  }
}
