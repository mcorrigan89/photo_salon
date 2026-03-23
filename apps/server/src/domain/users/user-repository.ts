import { inject, injectable } from "inversify";
import { eq } from "drizzle-orm";
import { type Database } from "@photo-salon/database";
import { user } from "@photo-salon/database/schema";
import { dbSymbol } from "@/lib/symbols.ts";
import { type UserContext } from "@/lib/context.ts";
import { UserEntity } from "./user-entity.ts";

@injectable()
export class UserRepository {
  constructor(@inject(dbSymbol) private db: Database) {}

  async userById(_ctx: UserContext, id: string): Promise<UserEntity | null> {
    const row = await this.db.query.user.findFirst({
      where: eq(user.id, id),
    });
    if (!row) return null;
    return UserEntity.fromModel(row);
  }

  async userByEmail(_ctx: UserContext, email: string): Promise<UserEntity | null> {
    const row = await this.db.query.user.findFirst({
      where: eq(user.email, email),
    });
    if (!row) return null;
    return UserEntity.fromModel(row);
  }
}
