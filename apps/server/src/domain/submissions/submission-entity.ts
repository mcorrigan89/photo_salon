import { type submission } from "@photo-salon/database/schema";
import { type InferSelectModel } from "drizzle-orm";

type SubmissionModel = InferSelectModel<typeof submission>;

export type SubmissionStatus = "pending" | "accepted" | "withdrawn";

export class SubmissionEntity {
  private constructor(
    public readonly id: string,
    public readonly salonCategoryId: string,
    public readonly memberId: string,
    public readonly storageKey: string | null,
    public readonly originalFilename: string | null,
    public readonly fileSizeBytes: number | null,
    public readonly widthPx: number | null,
    public readonly heightPx: number | null,
    public readonly status: SubmissionStatus,
    public readonly title: string | null,
    public readonly submittedAt: Date,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  static create(params: {
    salonCategoryId: string;
    memberId: string;
    storageKey?: string | null;
    originalFilename?: string | null;
    fileSizeBytes?: number | null;
    widthPx?: number | null;
    heightPx?: number | null;
    title?: string | null;
  }): SubmissionEntity {
    const now = new Date();
    return new SubmissionEntity(
      crypto.randomUUID(),
      params.salonCategoryId,
      params.memberId,
      params.storageKey ?? null,
      params.originalFilename ?? null,
      params.fileSizeBytes ?? null,
      params.widthPx ?? null,
      params.heightPx ?? null,
      "pending",
      params.title ?? null,
      now,
      now,
      now,
    );
  }

  static fromModel(row: SubmissionModel): SubmissionEntity {
    return new SubmissionEntity(
      row.id,
      row.salonCategoryId,
      row.memberId,
      row.storageKey,
      row.originalFilename,
      row.fileSizeBytes,
      row.widthPx,
      row.heightPx,
      row.status,
      row.title,
      row.submittedAt,
      row.createdAt,
      row.updatedAt,
    );
  }

  with(params: {
    title?: string | null;
    status?: SubmissionStatus;
    storageKey?: string | null;
    originalFilename?: string | null;
    fileSizeBytes?: number | null;
    widthPx?: number | null;
    heightPx?: number | null;
  }): SubmissionEntity {
    return new SubmissionEntity(
      this.id,
      this.salonCategoryId,
      this.memberId,
      params.storageKey !== undefined ? params.storageKey : this.storageKey,
      params.originalFilename !== undefined ? params.originalFilename : this.originalFilename,
      params.fileSizeBytes !== undefined ? params.fileSizeBytes : this.fileSizeBytes,
      params.widthPx !== undefined ? params.widthPx : this.widthPx,
      params.heightPx !== undefined ? params.heightPx : this.heightPx,
      params.status ?? this.status,
      params.title !== undefined ? params.title : this.title,
      this.submittedAt,
      this.createdAt,
      new Date(),
    );
  }

  get isWithdrawn(): boolean {
    return this.status === "withdrawn";
  }
}
