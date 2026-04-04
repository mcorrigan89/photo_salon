import { type templateCategorySlot } from "@photo-salon/database/schema";
import { type InferSelectModel } from "drizzle-orm";

type TemplateCategorySlotModel = InferSelectModel<typeof templateCategorySlot>;

export class TemplateCategorySlotEntity {
  private constructor(
    public readonly id: string,
    public readonly templateId: string,
    public readonly name: string,
    /** Null means inherit from the template's maxSubmissionsPerMember. */
    public readonly maxSubmissionsPerMember: number | null,
    public readonly displayOrder: number,
  ) {}

  static create(params: {
    templateId: string;
    name: string;
    maxSubmissionsPerMember?: number | null;
    displayOrder?: number;
  }): TemplateCategorySlotEntity {
    return new TemplateCategorySlotEntity(
      crypto.randomUUID(),
      params.templateId,
      params.name,
      params.maxSubmissionsPerMember ?? null,
      params.displayOrder ?? 0,
    );
  }

  static fromModel(row: TemplateCategorySlotModel): TemplateCategorySlotEntity {
    return new TemplateCategorySlotEntity(
      row.id,
      row.templateId,
      row.name,
      row.maxSubmissionsPerMember ?? null,
      row.displayOrder,
    );
  }

  with(params: {
    name?: string;
    maxSubmissionsPerMember?: number | null;
    displayOrder?: number;
  }): TemplateCategorySlotEntity {
    return new TemplateCategorySlotEntity(
      this.id,
      this.templateId,
      params.name ?? this.name,
      params.maxSubmissionsPerMember !== undefined
        ? params.maxSubmissionsPerMember
        : this.maxSubmissionsPerMember,
      params.displayOrder ?? this.displayOrder,
    );
  }
}
