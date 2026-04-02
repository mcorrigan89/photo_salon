import { type UserContext } from "@/lib/context.ts";
import { type AppDomain } from "@/domain/domain.ts";
import { type MemberDto } from "@photo-salon/contract";
import { type MemberEntity } from "@/domain/members/member-entity.ts";

function toDto(entity: MemberEntity): MemberDto {
  return {
    id: entity.id,
    userId: entity.userId,
    organizationId: entity.organizationId,
    memberNumber: entity.memberNumber,
    role: entity.role,
    createdAt: entity.createdAt,
    user: {
      id: entity.user.id,
      name: entity.user.name,
      email: entity.user.email,
    },
  };
}

export class MemberController {
  async listMembers(
    ctx: UserContext,
    domain: AppDomain,
    input: { organizationId: string },
  ): Promise<MemberDto[]> {
    const members = await domain.memberService.listMembers(ctx, input.organizationId);
    return members.map(toDto);
  }

  async addMember(
    ctx: UserContext,
    domain: AppDomain,
    input: { organizationId: string; name: string; email: string; memberNumber: string | null; role: string },
  ): Promise<MemberDto> {
    const entity = await domain.memberService.addMember(ctx, input);
    return toDto(entity);
  }

  async updateMember(
    ctx: UserContext,
    domain: AppDomain,
    input: { memberId: string; memberNumber?: string | null; role?: string },
  ): Promise<MemberDto> {
    const entity = await domain.memberService.updateMember(ctx, input);
    return toDto(entity);
  }

  async removeMember(
    ctx: UserContext,
    domain: AppDomain,
    memberId: string,
  ): Promise<{ success: boolean }> {
    await domain.memberService.removeMember(ctx, memberId);
    return { success: true };
  }
}

export const memberController = new MemberController();
