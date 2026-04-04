import { inject, injectable } from "inversify";
import { ORPCError } from "@orpc/server";
import { type UserContext } from "@/lib/context.ts";
import { SalonRepository } from "@/domain/salons/salon-repository.ts";
import { SubmissionRepository } from "@/domain/submissions/submission-repository.ts";
import { ScoreRepository } from "./score-repository.ts";
import { ScoreEntity } from "./score-entity.ts";
import { ScoreCriterionValueEntity } from "./score-criterion-value-entity.ts";
import { type SubmissionEntity } from "@/domain/submissions/submission-entity.ts";

export interface JudgingSubmission {
  submission: SubmissionEntity;
  score: ScoreEntity | null;
  categoryName: string;
  categoryId: string;
}

@injectable()
export class ScoringService {
  constructor(
    @inject(ScoreRepository) private scoreRepo: ScoreRepository,
    @inject(SalonRepository) private salonRepo: SalonRepository,
    @inject(SubmissionRepository) private submissionRepo: SubmissionRepository,
  ) {}

  async getScoresForSalon(ctx: UserContext, salonId: string) {
    ctx.logger.trace("Loading all scores for salon", salonId);
    const scores = await this.scoreRepo.listBySalonId(ctx, salonId);
    return scores;
  }

  async getJudgingSubmissions(
    ctx: UserContext,
    salonId: string,
    judgeUserId: string,
  ): Promise<JudgingSubmission[]> {
    ctx.logger.trace("Loading judging submissions", salonId);

    const salon = await this.salonRepo.findById(ctx, salonId);
    if (!salon) throw new ORPCError("NOT_FOUND", { message: "Salon not found." });
    if (salon.status !== "judging") {
      throw new ORPCError("BAD_REQUEST", { message: "Salon is not in judging status." });
    }
    if (salon.judgeId !== judgeUserId) {
      throw new ORPCError("FORBIDDEN", { message: "You are not the assigned judge." });
    }

    const existingScores = await this.scoreRepo.listBySalonId(ctx, salonId);
    const scoreBySubmission = new Map(existingScores.map((s) => [s.submissionId, s]));

    const results: JudgingSubmission[] = [];
    for (const category of salon.categories) {
      const submissions = await this.submissionRepo.listByCategory(ctx, category.id);
      for (const sub of submissions) {
        if (sub.status === "withdrawn") continue;
        results.push({
          submission: sub,
          score: scoreBySubmission.get(sub.id) ?? null,
          categoryName: category.name,
          categoryId: category.id,
        });
      }
    }

    return results;
  }

  async saveScore(
    ctx: UserContext,
    params: {
      submissionId: string;
      judgeUserId: string;
      salonId: string;
      criterionScores: Array<{ criterionId: string; value: string }>;
      comment: string | null;
    },
  ): Promise<ScoreEntity> {
    ctx.logger.info("Saving score", params.submissionId);

    const salon = await this.salonRepo.findById(ctx, params.salonId);
    if (!salon) throw new ORPCError("NOT_FOUND", { message: "Salon not found." });
    if (salon.status !== "judging") {
      throw new ORPCError("BAD_REQUEST", { message: "Salon is not in judging status." });
    }
    if (salon.judgeId !== params.judgeUserId) {
      throw new ORPCError("FORBIDDEN", { message: "You are not the assigned judge." });
    }

    // Find or create the score record
    let scoreEntity = await this.scoreRepo.findBySubmissionId(ctx, params.submissionId);
    if (!scoreEntity) {
      scoreEntity = await this.scoreRepo.save(
        ctx,
        ScoreEntity.create({ submissionId: params.submissionId, judgeId: params.judgeUserId }),
      );
    }

    // Save each criterion value
    for (const cs of params.criterionScores) {
      const existing = scoreEntity.criterionValues.find(
        (v) => v.salonScoringCriterionId === cs.criterionId,
      );
      if (existing) {
        await this.scoreRepo.saveCriterionValue(ctx, existing.with({ value: cs.value }));
      } else {
        await this.scoreRepo.saveCriterionValue(
          ctx,
          ScoreCriterionValueEntity.create({
            scoreId: scoreEntity.id,
            salonScoringCriterionId: cs.criterionId,
            value: cs.value,
          }),
        );
      }
    }

    // Calculate weighted total
    const totalScore = this.calculateTotalScore(salon.criteria, params.criterionScores);
    const allCriteriaScored = params.criterionScores.length === salon.criteria.length;

    const updated = await this.scoreRepo.save(
      ctx,
      scoreEntity.with({
        comment: params.comment,
        totalScore: totalScore.toFixed(2),
        isComplete: allCriteriaScored,
      }),
    );

    ctx.logger.info("Score saved", params.submissionId, `total=${totalScore.toFixed(2)}`);
    return updated;
  }

  private calculateTotalScore(
    criteria: Array<{ id: string; weight: string }>,
    scores: Array<{ criterionId: string; value: string }>,
  ): number {
    let total = 0;
    for (const criterion of criteria) {
      const scoreEntry = scores.find((s) => s.criterionId === criterion.id);
      if (!scoreEntry) continue;
      const value = parseFloat(scoreEntry.value);
      const weight = parseFloat(criterion.weight);
      total += value * weight;
    }
    return total;
  }
}
