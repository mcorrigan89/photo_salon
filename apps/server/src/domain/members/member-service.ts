import { inject, injectable } from "inversify";
import { ORPCError } from "@orpc/server";
import { type UserContext } from "@/lib/context.ts";
import { EmailService } from "@/domain/email/email-service.ts";
import { UserRepository } from "@/domain/users/user-repository.ts";
import { UserEntity } from "@/domain/users/user-entity.ts";
import { getSharedEnv } from "@photo-salon/env/shared";
import { MemberRepository } from "./member-repository.ts";
import { MemberEntity } from "./member-entity.ts";

@injectable()
export class MemberService {
  constructor(
    @inject(MemberRepository) private repo: MemberRepository,
    @inject(UserRepository) private userRepo: UserRepository,
    @inject(EmailService) private email: EmailService,
  ) {}

  async listMembers(ctx: UserContext, organizationId: string): Promise<MemberEntity[]> {
    ctx.logger.trace("Listing members", organizationId);
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
    ctx.logger.info("Adding member", params.email, params.organizationId);

    let userEntity = await this.userRepo.findByEmail(ctx, params.email);
    if (!userEntity) {
      ctx.logger.info("Creating new user for member", params.email);
      userEntity = await this.userRepo.save(
        ctx,
        UserEntity.create({ name: params.name, email: params.email }),
      );
    }

    const existing = await this.repo.findByUserAndOrg(ctx, userEntity.id, params.organizationId);
    if (existing) {
      ctx.logger.warn("Member already exists", params.email, params.organizationId);
      throw new ORPCError("CONFLICT", {
        message: "This person is already a member of this club.",
      });
    }

    const newMember = await this.repo.save(
      ctx,
      MemberEntity.create({
        userId: userEntity.id,
        organizationId: params.organizationId,
        memberNumber: params.memberNumber,
        role: params.role,
        user: { id: userEntity.id, name: userEntity.name, email: userEntity.email },
      }),
    );

    ctx.logger.info("Member added", newMember.id, params.email);
    await this.sendWelcomeEmail(ctx, params.email);

    return newMember;
  }

  async updateMember(
    ctx: UserContext,
    params: {
      memberId: string;
      name?: string;
      memberNumber?: string | null;
      role?: string;
    },
  ): Promise<MemberEntity> {
    ctx.logger.info("Updating member", params.memberId);

    const existing = await this.repo.findById(ctx, params.memberId);
    if (!existing) {
      ctx.logger.warn("Member not found for update", params.memberId);
      throw new ORPCError("NOT_FOUND", { message: "Member not found." });
    }

    if (params.name) {
      const userEntity = await this.userRepo.findById(ctx, existing.userId);
      if (userEntity) {
        ctx.logger.info("Updating user name", existing.userId, params.name);
        await this.userRepo.save(ctx, userEntity.with({ name: params.name }));
      }
    }

    return this.repo.save(ctx, existing.with({ memberNumber: params.memberNumber, role: params.role }));
  }

  async removeMember(ctx: UserContext, memberId: string): Promise<void> {
    ctx.logger.info("Removing member", memberId);

    const existing = await this.repo.findById(ctx, memberId);
    if (!existing) {
      ctx.logger.warn("Member not found for removal", memberId);
      throw new ORPCError("NOT_FOUND", { message: "Member not found." });
    }
    await this.repo.delete(ctx, existing);
    ctx.logger.info("Member removed", memberId);
  }

  private async sendWelcomeEmail(ctx: UserContext, email: string): Promise<void> {
    try {
      const loginUrl = `${getSharedEnv().CLIENT_URL}/login`;
      await this.email.send(ctx, {
        to: email,
        subject: "Welcome — log in to Photo Salon",
        textBody: `You've been added as a member. Visit ${loginUrl} to request your magic link and sign in.`,
        htmlBody: `<p>You've been added as a member. <a href="${loginUrl}">Click here</a> to request your magic link and sign in.</p>`,
      });
      ctx.logger.info("Welcome email sent", email);
    } catch {
      ctx.logger.warn(`Failed to send welcome email to ${email}`);
    }
  }
}
