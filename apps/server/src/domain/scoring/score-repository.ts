import { inject, injectable } from "inversify";
import { eq, inArray } from "drizzle-orm";
import { type Database } from "@photo-salon/database";
import { score, scoreCriterionValue, submission, salonCategory } from "@photo-salon/database/schema";
import { dbSymbol } from "@/lib/symbols.ts";
import { type UserContext } from "@/lib/context.ts";
import { ScoreEntity } from "./score-entity.ts";
import { ScoreCriterionValueEntity } from "./score-criterion-value-entity.ts";

@injectable()
export class ScoreRepository {
  constructor(@inject(dbSymbol) private db: Database) {}

  async findBySubmissionId(_ctx: UserContext, submissionId: string): Promise<ScoreEntity | null> {
    const row = await this.db.query.score.findFirst({
      where: eq(score.submissionId, submissionId),
    });
    if (!row) return null;
    return this.loadAggregate(row.id);
  }

  async listBySalonId(_ctx: UserContext, salonId: string): Promise<ScoreEntity[]> {
    const categories = await this.db
      .select({ id: salonCategory.id })
      .from(salonCategory)
      .where(eq(salonCategory.salonId, salonId));

    if (categories.length === 0) return [];

    const categoryIds = categories.map((c) => c.id);
    const submissions = await this.db
      .select({ id: submission.id })
      .from(submission)
      .where(inArray(submission.salonCategoryId, categoryIds));

    if (submissions.length === 0) return [];

    const submissionIds = submissions.map((s) => s.id);
    const scores = await this.db.query.score.findMany({
      where: inArray(score.submissionId, submissionIds),
    });

    if (scores.length === 0) return [];

    const scoreIds = scores.map((s) => s.id);
    const allValues = await this.db.query.scoreCriterionValue.findMany({
      where: inArray(scoreCriterionValue.scoreId, scoreIds),
    });

    return scores.map((s) =>
      ScoreEntity.fromModels(
        s,
        allValues.filter((v) => v.scoreId === s.id),
      ),
    );
  }

  async save(_ctx: UserContext, entity: ScoreEntity): Promise<ScoreEntity> {
    await this.db
      .insert(score)
      .values({
        id: entity.id,
        submissionId: entity.submissionId,
        judgeId: entity.judgeId,
        comment: entity.comment,
        totalScore: entity.totalScore,
        isComplete: entity.isComplete,
        completedAt: entity.completedAt,
        createdAt: entity.createdAt,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: score.id,
        set: {
          comment: entity.comment,
          totalScore: entity.totalScore,
          isComplete: entity.isComplete,
          completedAt: entity.completedAt,
          updatedAt: new Date(),
        },
      });

    return this.loadAggregate(entity.id);
  }

  async saveCriterionValue(
    _ctx: UserContext,
    value: ScoreCriterionValueEntity,
  ): Promise<ScoreCriterionValueEntity> {
    const [row] = await this.db
      .insert(scoreCriterionValue)
      .values({
        id: value.id,
        scoreId: value.scoreId,
        salonScoringCriterionId: value.salonScoringCriterionId,
        value: value.value,
      })
      .onConflictDoUpdate({
        target: scoreCriterionValue.id,
        set: { value: value.value },
      })
      .returning();

    return ScoreCriterionValueEntity.fromModel(row);
  }

  private async loadAggregate(scoreId: string): Promise<ScoreEntity> {
    const [scoreRow, values] = await Promise.all([
      this.db.query.score.findFirst({ where: eq(score.id, scoreId) }),
      this.db.query.scoreCriterionValue.findMany({
        where: eq(scoreCriterionValue.scoreId, scoreId),
      }),
    ]);

    if (!scoreRow) throw new Error(`Score ${scoreId} not found after write`);
    return ScoreEntity.fromModels(scoreRow, values);
  }
}
