import { inject, injectable } from "inversify";
import { type UserContext } from "@/lib/context.ts";
import { UserRepository } from "./user-repository.ts";
import { type UserEntity } from "./user-entity.ts";

@injectable()
export class UserService {
  constructor(@inject(UserRepository) private repo: UserRepository) {}

  async currentUser(
    ctx: UserContext,
  ): Promise<{ userEntity: UserEntity | null; sessionEntity: UserContext["session"] | null }> {
    if (!ctx.currentUserId) {
      return { userEntity: null, sessionEntity: null };
    }
    const userEntity = await this.repo.findById(ctx, ctx.currentUserId);
    return { userEntity, sessionEntity: ctx.session ?? null };
  }
}
