import { ORPCError } from "@orpc/server";
import { type UserContext } from "@/lib/context.ts";
import { type AppDomain } from "@/domain/domain.ts";
import { type JudgingSubmissionDto, type ScoreDto } from "@photo-salon/contract";
import { getSignedViewUrl } from "@/lib/storage.ts";
import { type ScoreEntity } from "@/domain/scoring/score-entity.ts";

function scoreToDto(entity: ScoreEntity): ScoreDto {
  return {
    id: entity.id,
    submissionId: entity.submissionId,
    comment: entity.comment,
    totalScore: entity.totalScore,
    isComplete: entity.isComplete,
    criterionValues: entity.criterionValues.map((v) => ({
      id: v.id,
      salonScoringCriterionId: v.salonScoringCriterionId,
      value: v.value,
    })),
  };
}

export class JudgingController {
  async getSubmissions(
    ctx: UserContext,
    domain: AppDomain,
    input: { salonId: string },
  ): Promise<JudgingSubmissionDto[]> {
    if (!ctx.currentUserId) throw new ORPCError("FORBIDDEN");

    const items = await domain.scoringService.getJudgingSubmissions(
      ctx,
      input.salonId,
      ctx.currentUserId,
    );

    const results: JudgingSubmissionDto[] = [];
    for (const item of items) {
      let imageUrl: string | null = null;
      if (item.submission.storageKey) {
        try {
          imageUrl = await getSignedViewUrl(item.submission.storageKey);
        } catch {
          // S3 unavailable
        }
      }
      results.push({
        submissionId: item.submission.id,
        title: item.submission.title,
        imageUrl,
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        score: item.score ? scoreToDto(item.score) : null,
      });
    }

    return results;
  }

  async myAssignments(ctx: UserContext, domain: AppDomain) {
    if (!ctx.currentUserId) throw new ORPCError("FORBIDDEN");
    const salons = await domain.scoringService.getMyJudgingAssignments(ctx, ctx.currentUserId);
    return salons.map((s) => ({
      salonId: s.id,
      salonName: s.name,
      status: s.status,
    }));
  }

  async saveScore(
    ctx: UserContext,
    domain: AppDomain,
    input: {
      salonId: string;
      submissionId: string;
      criterionScores: Array<{ criterionId: string; value: string }>;
      comment: string | null;
    },
  ): Promise<ScoreDto> {
    if (!ctx.currentUserId) throw new ORPCError("FORBIDDEN");

    const entity = await domain.scoringService.saveScore(ctx, {
      ...input,
      judgeUserId: ctx.currentUserId,
    });

    return scoreToDto(entity);
  }
}

export const judgingController = new JudgingController();
