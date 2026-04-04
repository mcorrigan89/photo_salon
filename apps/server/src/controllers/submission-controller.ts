import { ORPCError } from "@orpc/server";
import { type UserContext } from "@/lib/context.ts";
import { type AppDomain } from "@/domain/domain.ts";
import { type SubmissionDto, type SalonSubmissionSummaryDto } from "@photo-salon/contract";
import { type SubmissionEntity } from "@/domain/submissions/submission-entity.ts";
import { type ScoreEntity } from "@/domain/scoring/score-entity.ts";
import { type SalonEntity } from "@/domain/salons/salon-entity.ts";
import { getSignedViewUrl } from "@/lib/storage.ts";

async function toDto(
  entity: SubmissionEntity,
  scoreEntity: ScoreEntity | null,
  salon: SalonEntity | null,
): Promise<SubmissionDto> {
  let imageUrl: string | null = null;
  if (entity.storageKey) {
    try {
      imageUrl = await getSignedViewUrl(entity.storageKey);
    } catch {
      // S3 unavailable — leave null
    }
  }

  // Only show scores when salon is complete
  let score: SubmissionDto["score"] = null;
  if (scoreEntity && salon?.status === "complete") {
    score = {
      totalScore: scoreEntity.totalScore,
      comment: scoreEntity.comment,
      isComplete: scoreEntity.isComplete,
      criterionValues: scoreEntity.criterionValues.map((cv) => {
        const criterion = salon.criteria.find((c) => c.id === cv.salonScoringCriterionId);
        return {
          criterionName: criterion?.name ?? "Unknown",
          value: cv.value,
        };
      }),
    };
  }

  return {
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
    imageUrl,
    score,
    submittedAt: entity.submittedAt,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

function requireMemberId(ctx: UserContext): { userId: string } {
  if (!ctx.currentUserId) throw new ORPCError("FORBIDDEN");
  return { userId: ctx.currentUserId };
}

export class SubmissionController {
  async listMySubmissions(
    ctx: UserContext,
    domain: AppDomain,
    input: { salonId: string },
  ): Promise<SubmissionDto[]> {
    const { userId } = requireMemberId(ctx);
    const memberId = await this.resolveMemberId(ctx, domain, userId, input.salonId);
    const submissions = await domain.submissionService.listMySubmissions(ctx, memberId, input.salonId);

    // Load salon and scores for completed salons
    const salon = await domain.salonService.getSalon(ctx, input.salonId);
    let scoreMap = new Map<string, ScoreEntity>();
    if (salon.status === "complete") {
      const scores = await domain.scoringService.getScoresForSalon(ctx, input.salonId);
      scoreMap = new Map(scores.map((s) => [s.submissionId, s]));
    }

    return Promise.all(
      submissions.map((sub) => toDto(sub, scoreMap.get(sub.id) ?? null, salon)),
    );
  }

  async listAllMySubmissions(
    ctx: UserContext,
    domain: AppDomain,
  ): Promise<SubmissionDto[]> {
    const { userId } = requireMemberId(ctx);
    const orgId = ctx.session?.activeOrganizationId;
    if (!orgId) throw new ORPCError("FORBIDDEN", { message: "No active organization." });
    const members = await domain.memberService.listMembers(ctx, orgId);
    const member = members.find((m) => m.userId === userId);
    if (!member) throw new ORPCError("FORBIDDEN", { message: "Not a member." });
    const submissions = await domain.submissionService.listAllMySubmissions(ctx, member.id);
    return Promise.all(submissions.map((sub) => toDto(sub, null, null)));
  }

  async submitPrint(
    ctx: UserContext,
    domain: AppDomain,
    input: { salonId: string; categoryId: string; title: string },
  ): Promise<SubmissionDto> {
    const { userId } = requireMemberId(ctx);
    const memberId = await this.resolveMemberId(ctx, domain, userId, input.salonId);
    const submission = await domain.submissionService.submitPrint(ctx, {
      ...input,
      memberId,
    });
    return toDto(submission, null, null);
  }

  async submitDigital(
    ctx: UserContext,
    domain: AppDomain,
    params: {
      salonId: string;
      categoryId: string;
      title: string;
      file: Buffer;
      filename: string;
      contentType: string;
    },
  ): Promise<SubmissionDto> {
    const { userId } = requireMemberId(ctx);
    const memberId = await this.resolveMemberId(ctx, domain, userId, params.salonId);
    const submission = await domain.submissionService.submitDigital(ctx, {
      ...params,
      memberId,
    });
    return toDto(submission, null, null);
  }

  async salonSummary(
    ctx: UserContext,
    domain: AppDomain,
    input: { salonId: string },
  ): Promise<SalonSubmissionSummaryDto[]> {
    const salon = await domain.salonService.getSalon(ctx, input.salonId);
    const summary = await domain.submissionService.getSalonSubmissionSummary(ctx, input.salonId);
    const members = await domain.memberService.listMembers(ctx, salon.organizationId);

    const memberMap = new Map(members.map((m) => [m.id, m]));
    const categoryMap = new Map(salon.categories.map((c) => [c.id, c.name]));

    return summary.map((s) => {
      const member = memberMap.get(s.memberId);
      return {
        memberId: s.memberId,
        memberName: member?.user.name ?? "Unknown",
        memberNumber: member?.memberNumber ?? null,
        categoryId: s.categoryId,
        categoryName: categoryMap.get(s.categoryId) ?? "Unknown",
        count: s.count,
      };
    });
  }

  async withdraw(
    ctx: UserContext,
    domain: AppDomain,
    submissionId: string,
  ): Promise<SubmissionDto> {
    const { userId } = requireMemberId(ctx);
    const orgId = ctx.session?.activeOrganizationId;
    if (!orgId) throw new ORPCError("FORBIDDEN");
    const members = await domain.memberService.listMembers(ctx, orgId);
    const member = members.find((m) => m.userId === userId);
    if (!member) throw new ORPCError("FORBIDDEN");
    const submission = await domain.submissionService.withdraw(ctx, submissionId, member.id);
    return toDto(submission, null, null);
  }

  private async resolveMemberId(
    ctx: UserContext,
    domain: AppDomain,
    userId: string,
    salonId: string,
  ): Promise<string> {
    const salon = await domain.salonService.getSalon(ctx, salonId);
    const members = await domain.memberService.listMembers(ctx, salon.organizationId);
    const member = members.find((m) => m.userId === userId);
    if (!member) throw new ORPCError("FORBIDDEN", { message: "Not a member of this club." });
    return member.id;
  }
}

export const submissionController = new SubmissionController();
