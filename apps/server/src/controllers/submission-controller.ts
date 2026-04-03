import { ORPCError } from "@orpc/server";
import { type UserContext } from "@/lib/context.ts";
import { type AppDomain } from "@/domain/domain.ts";
import { type SubmissionDto } from "@photo-salon/contract";
import { type SubmissionEntity } from "@/domain/submissions/submission-entity.ts";
import { getSignedViewUrl } from "@/lib/storage.ts";

async function toDto(entity: SubmissionEntity): Promise<SubmissionDto> {
  let imageUrl: string | null = null;
  if (entity.storageKey) {
    try {
      imageUrl = await getSignedViewUrl(entity.storageKey);
    } catch {
      // S3 unavailable — leave null
    }
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
    submittedAt: entity.submittedAt,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

async function toDtos(entities: SubmissionEntity[]): Promise<SubmissionDto[]> {
  return Promise.all(entities.map(toDto));
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
    // Find the member record for this user in the salon's org
    const memberId = await this.resolveMemberId(ctx, domain, userId, input.salonId);
    const submissions = await domain.submissionService.listMySubmissions(ctx, memberId, input.salonId);
    return toDtos(submissions);
  }

  async listAllMySubmissions(
    ctx: UserContext,
    domain: AppDomain,
  ): Promise<SubmissionDto[]> {
    const { userId } = requireMemberId(ctx);
    // Get member for active org
    const orgId = ctx.session?.activeOrganizationId;
    if (!orgId) throw new ORPCError("FORBIDDEN", { message: "No active organization." });
    const members = await domain.memberService.listMembers(ctx, orgId);
    const member = members.find((m) => m.userId === userId);
    if (!member) throw new ORPCError("FORBIDDEN", { message: "Not a member." });
    const submissions = await domain.submissionService.listAllMySubmissions(ctx, member.id);
    return toDtos(submissions);
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
    return toDto(submission);
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
    return toDto(submission);
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
    return toDto(submission);
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
