import { type UserContext } from "@/lib/context.ts";
import { type AppDomain } from "@/domain/domain.ts";
import { type CurrentUserDto } from "@photo-salon/contract";

export class UserController {
  async currentUser(ctx: UserContext, domain: AppDomain): Promise<CurrentUserDto | null> {
    const { userEntity, sessionEntity } = await domain.userService.currentUser(ctx);
    if (!userEntity || !sessionEntity) {
      return null;
    }
    return {
      id: userEntity.id,
      name: userEntity.name,
      email: userEntity.email,
      emailVerified: userEntity.emailVerified,
      role: userEntity.role,
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
