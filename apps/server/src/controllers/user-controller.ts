import { eq, and } from "drizzle-orm";
import { type Database } from "@photo-salon/database";
import { member, organization } from "@photo-salon/database/schema";
import { type UserContext } from "@/lib/context.ts";
import { type AppDomain } from "@/domain/domain.ts";
import { type CurrentUserDto } from "@photo-salon/contract";
import { di } from "@/lib/di.ts";
import { dbSymbol } from "@/lib/symbols.ts";

export class UserController {
  async currentUser(ctx: UserContext, domain: AppDomain): Promise<CurrentUserDto | null> {
    const { userEntity, sessionEntity } = await domain.userService.currentUser(ctx);
    if (!userEntity || !sessionEntity) {
      return null;
    }

    let activeOrganization: CurrentUserDto["activeOrganization"] = null;
    const activeOrgId = sessionEntity.activeOrganizationId;

    if (activeOrgId) {
      const db = di.get<Database>(dbSymbol);
      const [orgMember] = await db
        .select({
          orgId: organization.id,
          orgName: organization.name,
          memberRole: member.role,
        })
        .from(member)
        .innerJoin(organization, eq(member.organizationId, organization.id))
        .where(and(eq(member.userId, userEntity.id), eq(member.organizationId, activeOrgId)))
        .limit(1);

      if (orgMember) {
        activeOrganization = {
          id: orgMember.orgId,
          name: orgMember.orgName,
          memberRole: orgMember.memberRole,
        };
      }
    }

    return {
      id: userEntity.id,
      name: userEntity.name,
      email: userEntity.email,
      emailVerified: userEntity.emailVerified,
      role: userEntity.role,
      activeOrganization,
      session: {
        id: sessionEntity.id,
        createdAt: sessionEntity.createdAt,
        expiresAt: sessionEntity.expiresAt,
        userAgent: sessionEntity.userAgent ?? null,
        ipAddress: sessionEntity.ipAddress ?? null,
      },
    };
  }
}

export const userController = new UserController();
