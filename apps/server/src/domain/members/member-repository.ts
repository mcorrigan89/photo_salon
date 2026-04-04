import { inject, injectable } from "inversify";
import { and, eq } from "drizzle-orm";
import { type Database } from "@photo-salon/database";
import { member, user } from "@photo-salon/database/schema";
import { dbSymbol } from "@/lib/symbols.ts";
import { type UserContext } from "@/lib/context.ts";
import { UserEntity } from "@/domain/users/user-entity.ts";
import { MemberEntity } from "./member-entity.ts";

@injectable()
export class MemberRepository {
  constructor(@inject(dbSymbol) private db: Database) {}

  async listByOrganization(_ctx: UserContext, organizationId: string): Promise<MemberEntity[]> {
    const rows = await this.db
      .select()
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(eq(member.organizationId, organizationId));

    return rows.map((row) => MemberEntity.fromModels(row.member, UserEntity.fromModel(row.user)));
  }

  async findById(_ctx: UserContext, memberId: string): Promise<MemberEntity | null> {
    const rows = await this.db
      .select()
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(eq(member.id, memberId))
      .limit(1);

    if (rows.length === 0) return null;
    return MemberEntity.fromModels(rows[0].member, UserEntity.fromModel(rows[0].user));
  }

  async findByUserAndOrg(
    _ctx: UserContext,
    userId: string,
    organizationId: string,
  ): Promise<MemberEntity | null> {
    const rows = await this.db
      .select()
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(and(eq(member.userId, userId), eq(member.organizationId, organizationId)))
      .limit(1);

    if (rows.length === 0) return null;
    return MemberEntity.fromModels(rows[0].member, UserEntity.fromModel(rows[0].user));
  }

  async save(_ctx: UserContext, entity: MemberEntity): Promise<MemberEntity> {
    await this.db
      .insert(member)
      .values({
        id: entity.id,
        userId: entity.userId,
        organizationId: entity.organizationId,
        memberNumber: entity.memberNumber ?? undefined,
        role: entity.role,
        createdAt: entity.createdAt,
      })
      .onConflictDoUpdate({
        target: member.id,
        set: {
          memberNumber: entity.memberNumber,
          role: entity.role,
        },
      });

    const saved = await this.findById(_ctx, entity.id);
    if (!saved) throw new Error(`Member ${entity.id} not found after save`);
    return saved;
  }

  async delete(_ctx: UserContext, entity: MemberEntity): Promise<void> {
    await this.db.delete(member).where(eq(member.id, entity.id));
  }
}
