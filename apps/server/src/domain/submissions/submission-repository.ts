import { inject, injectable } from "inversify";
import { and, eq, inArray } from "drizzle-orm";
import { type Database } from "@photo-salon/database";
import { submission, salonCategory } from "@photo-salon/database/schema";
import { dbSymbol } from "@/lib/symbols.ts";
import { type UserContext } from "@/lib/context.ts";
import { SubmissionEntity } from "./submission-entity.ts";

@injectable()
export class SubmissionRepository {
  constructor(@inject(dbSymbol) private db: Database) {}

  async findById(_ctx: UserContext, submissionId: string): Promise<SubmissionEntity | null> {
    const row = await this.db.query.submission.findFirst({
      where: eq(submission.id, submissionId),
    });
    if (!row) return null;
    return SubmissionEntity.fromModel(row);
  }

  async listByMemberAndSalon(
    _ctx: UserContext,
    memberId: string,
    salonId: string,
  ): Promise<SubmissionEntity[]> {
    // Get category IDs for this salon, then find submissions
    const categories = await this.db
      .select({ id: salonCategory.id })
      .from(salonCategory)
      .where(eq(salonCategory.salonId, salonId));

    if (categories.length === 0) return [];

    const categoryIds = categories.map((c) => c.id);
    const rows = await this.db.query.submission.findMany({
      where: and(
        eq(submission.memberId, memberId),
        inArray(submission.salonCategoryId, categoryIds),
      ),
    });

    return rows.map(SubmissionEntity.fromModel);
  }

  async listByCategory(_ctx: UserContext, categoryId: string): Promise<SubmissionEntity[]> {
    const rows = await this.db.query.submission.findMany({
      where: eq(submission.salonCategoryId, categoryId),
    });
    return rows.map(SubmissionEntity.fromModel);
  }

  async listByMember(_ctx: UserContext, memberId: string): Promise<SubmissionEntity[]> {
    const rows = await this.db.query.submission.findMany({
      where: eq(submission.memberId, memberId),
    });
    return rows.map(SubmissionEntity.fromModel);
  }

  async hasSubmissionsForCategory(_ctx: UserContext, categoryId: string): Promise<boolean> {
    const row = await this.db.query.submission.findFirst({
      where: eq(submission.salonCategoryId, categoryId),
    });
    return row !== undefined;
  }

  async hasSubmissionsForSalon(_ctx: UserContext, salonId: string): Promise<boolean> {
    const categories = await this.db
      .select({ id: salonCategory.id })
      .from(salonCategory)
      .where(eq(salonCategory.salonId, salonId));

    if (categories.length === 0) return false;

    const categoryIds = categories.map((c) => c.id);
    const row = await this.db.query.submission.findFirst({
      where: inArray(submission.salonCategoryId, categoryIds),
    });
    return row !== undefined;
  }

  async countByMemberAndCategory(
    _ctx: UserContext,
    memberId: string,
    categoryId: string,
  ): Promise<number> {
    const rows = await this.db.query.submission.findMany({
      where: and(
        eq(submission.memberId, memberId),
        eq(submission.salonCategoryId, categoryId),
        // Don't count withdrawn
      ),
    });
    return rows.filter((r) => r.status !== "withdrawn").length;
  }

  async countByMemberAndSalon(
    _ctx: UserContext,
    memberId: string,
    salonId: string,
  ): Promise<number> {
    const categories = await this.db
      .select({ id: salonCategory.id })
      .from(salonCategory)
      .where(eq(salonCategory.salonId, salonId));

    if (categories.length === 0) return 0;

    const categoryIds = categories.map((c) => c.id);
    const rows = await this.db.query.submission.findMany({
      where: and(
        eq(submission.memberId, memberId),
        inArray(submission.salonCategoryId, categoryIds),
      ),
    });
    return rows.filter((r) => r.status !== "withdrawn").length;
  }

  async save(_ctx: UserContext, entity: SubmissionEntity): Promise<SubmissionEntity> {
    const [row] = await this.db
      .insert(submission)
      .values({
        id: entity.id,
        salonCategoryId: entity.salonCategoryId,
        memberId: entity.memberId,
        storageKey: entity.storageKey,
        originalFilename: entity.originalFilename,
        fileSizeBytes: entity.fileSizeBytes,
        widthPx: entity.widthPx,
        heightPx: entity.heightPx,
        status: entity.status,
        title: entity.title,
        submittedAt: entity.submittedAt,
        createdAt: entity.createdAt,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: submission.id,
        set: {
          storageKey: entity.storageKey,
          originalFilename: entity.originalFilename,
          fileSizeBytes: entity.fileSizeBytes,
          widthPx: entity.widthPx,
          heightPx: entity.heightPx,
          status: entity.status,
          title: entity.title,
          updatedAt: new Date(),
        },
      })
      .returning();

    return SubmissionEntity.fromModel(row);
  }

  async delete(_ctx: UserContext, entity: SubmissionEntity): Promise<void> {
    await this.db.delete(submission).where(eq(submission.id, entity.id));
  }
}
