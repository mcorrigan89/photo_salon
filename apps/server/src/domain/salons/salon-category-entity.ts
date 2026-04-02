import { type salonCategory } from "@photo-salon/database/schema";
import { type InferSelectModel } from "drizzle-orm";

type SalonCategoryModel = InferSelectModel<typeof salonCategory>;

export class SalonCategoryEntity {
  private constructor(
    public readonly id: string,
    public readonly salonId: string,
    public readonly name: string,
    /** Null means inherit from salon.maxSubmissionsPerMember. */
    public readonly maxSubmissionsPerMember: number | null,
    public readonly displayOrder: number,
  ) {}

  static create(params: {
    salonId: string;
    name: string;
    maxSubmissionsPerMember?: number | null;
    displayOrder?: number;
  }): SalonCategoryEntity {
    return new SalonCategoryEntity(
      crypto.randomUUID(),
      params.salonId,
      params.name,
      params.maxSubmissionsPerMember ?? null,
      params.displayOrder ?? 0,
    );
  }

  static fromModel(row: SalonCategoryModel): SalonCategoryEntity {
    return new SalonCategoryEntity(
      row.id,
      row.salonId,
      row.name,
      row.maxSubmissionsPerMember ?? null,
      row.displayOrder,
    );
  }

  with(params: {
    name?: string;
    maxSubmissionsPerMember?: number | null;
    displayOrder?: number;
  }): SalonCategoryEntity {
    return new SalonCategoryEntity(
      this.id,
      this.salonId,
      params.name ?? this.name,
      params.maxSubmissionsPerMember !== undefined
        ? params.maxSubmissionsPerMember
        : this.maxSubmissionsPerMember,
      params.displayOrder ?? this.displayOrder,
    );
  }
}
