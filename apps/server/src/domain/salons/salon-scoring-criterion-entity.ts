import { type salonScoringCriterion } from "@photo-salon/database/schema";
import { type InferSelectModel } from "drizzle-orm";

type SalonScoringCriterionModel = InferSelectModel<typeof salonScoringCriterion>;

/**
 * Snapshot of a scoring criterion, copied from the template at salon creation.
 * Editable while the salon is in draft; immutable once open.
 */
export class SalonScoringCriterionEntity {
  private constructor(
    public readonly id: string,
    public readonly salonId: string,
    public readonly name: string,
    public readonly minScore: number,
    public readonly maxScore: number,
    public readonly weight: string,
    public readonly displayOrder: number,
  ) {}

  static create(params: {
    salonId: string;
    name: string;
    minScore: number;
    maxScore: number;
    weight: string;
    displayOrder: number;
  }): SalonScoringCriterionEntity {
    return new SalonScoringCriterionEntity(
      crypto.randomUUID(),
      params.salonId,
      params.name,
      params.minScore,
      params.maxScore,
      params.weight,
      params.displayOrder,
    );
  }

  with(params: {
    name?: string;
    minScore?: number;
    maxScore?: number;
    weight?: string;
    displayOrder?: number;
  }): SalonScoringCriterionEntity {
    return new SalonScoringCriterionEntity(
      this.id,
      this.salonId,
      params.name ?? this.name,
      params.minScore ?? this.minScore,
      params.maxScore ?? this.maxScore,
      params.weight ?? this.weight,
      params.displayOrder ?? this.displayOrder,
    );
  }

  static fromModel(row: SalonScoringCriterionModel): SalonScoringCriterionEntity {
    return new SalonScoringCriterionEntity(
      row.id,
      row.salonId,
      row.name,
      row.minScore,
      row.maxScore,
      row.weight,
      row.displayOrder,
    );
  }
}
