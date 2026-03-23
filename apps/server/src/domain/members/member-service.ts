import { inject, injectable } from "inversify";
import { ORPCError } from "@orpc/server";
import { type UserContext } from "@/lib/context.ts";
import { EmailService } from "@/domain/email/email-service.ts";
import { getSharedEnv } from "@photo-salon/env/shared";
import { MemberRepository } from "./member-repository.ts";
import { type MemberEntity } from "./member-entity.ts";

@injectable()
export class MemberService {
  constructor(
    @inject(MemberRepository) private repo: MemberRepository,
    @inject(EmailService) private email: EmailService,
  ) {}

  async listMembers(ctx: UserContext, organizationId: string): Promise<MemberEntity[]> {
    return this.repo.listByOrganization(ctx, organizationId);
  }

  async addMember(
    ctx: UserContext,
    params: {
      name: string;
      email: string;
      memberNumber: string | null;
      role: string;
      organizationId: string;
    },
  ): Promise<MemberEntity> {
    // Find or create the user
    let userRow = await this.repo.findUserByEmail(ctx, params.email);

    if (!userRow) {
      userRow = await this.repo.createUser(ctx, {
        name: params.name,
        email: params.email,
      });
    }

    // Check not already a member
    const existing = await this.repo.findByUserAndOrg(ctx, userRow.id, params.organizationId);
    if (existing) {
      throw new ORPCError("CONFLICT", {
        message: "This person is already a member of this club.",
      });
    }

    const newMember = await this.repo.create(ctx, {
      userId: userRow.id,
      organizationId: params.organizationId,
      memberNumber: params.memberNumber,
      role: params.role,
    });

    // Send magic link so new member can log in
    await this.sendWelcomeMagicLink(ctx, params.email);

    return newMember;
  }

  async updateMember(
    ctx: UserContext,
    params: {
      memberId: string;
      memberNumber?: string | null;
      role?: string;
    },
  ): Promise<MemberEntity> {
    const existing = await this.repo.findById(ctx, params.memberId);
    if (!existing) {
      throw new ORPCError("NOT_FOUND", { message: "Member not found." });
    }
    return this.repo.update(ctx, params.memberId, {
      memberNumber: params.memberNumber,
      role: params.role,
    });
  }

  async removeMember(ctx: UserContext, memberId: string): Promise<void> {
    const existing = await this.repo.findById(ctx, memberId);
    if (!existing) {
      throw new ORPCError("NOT_FOUND", { message: "Member not found." });
    }
    await this.repo.remove(ctx, memberId);
  }

  private async sendWelcomeMagicLink(ctx: UserContext, email: string): Promise<void> {
    try {
      const loginUrl = `${getSharedEnv().CLIENT_URL}/login`;
      await this.email.send(ctx, {
        to: email,
        subject: "Welcome — log in to Photo Salon",
        textBody: `You've been added as a member. Visit ${loginUrl} to request your magic link and sign in.`,
        htmlBody: `<p>You've been added as a member. <a href="${loginUrl}">Click here</a> to request your magic link and sign in.</p>`,
      });
    } catch {
      // Non-fatal — member can request their own magic link later
      ctx.logger.warn(`Failed to send welcome email to ${email}`);
    }
  }
}
