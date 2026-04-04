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

  async findById(_ctx: UserContext, id: string): Promise<UserEntity | null> {
    const row = await this.db.query.user.findFirst({ where: eq(user.id, id) });
    if (!row) return null;
    return UserEntity.fromModel(row);
  }

  async findByEmail(_ctx: UserContext, email: string): Promise<UserEntity | null> {
    const row = await this.db.query.user.findFirst({ where: eq(user.email, email) });
    if (!row) return null;
    return UserEntity.fromModel(row);
  }

  async save(_ctx: UserContext, entity: UserEntity): Promise<UserEntity> {
    const [row] = await this.db
      .insert(user)
      .values({
        id: entity.id,
        name: entity.name,
        email: entity.email,
        emailVerified: entity.emailVerified,
        createdAt: entity.createdAt,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: user.id,
        set: {
          name: entity.name,
          email: entity.email,
          updatedAt: new Date(),
        },
      })
      .returning();

    return UserEntity.fromModel(row);
  }
}
