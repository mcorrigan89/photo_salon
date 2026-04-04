import { inject, injectable } from "inversify";
import { and, eq } from "drizzle-orm";
import { type Database } from "@photo-salon/database";
import { member, user } from "@photo-salon/database/schema";
import { dbSymbol } from "@/lib/symbols.ts";
import { type UserContext } from "@/lib/context.ts";
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

    return rows.map((row) => MemberEntity.fromModels(row.member, row.user));
  }

  async findById(_ctx: UserContext, memberId: string): Promise<MemberEntity | null> {
    const rows = await this.db
      .select()
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(eq(member.id, memberId))
      .limit(1);

    if (rows.length === 0) return null;
    return MemberEntity.fromModels(rows[0].member, rows[0].user);
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
    return MemberEntity.fromModels(rows[0].member, rows[0].user);
  }

  async create(
    _ctx: UserContext,
    params: {
      userId: string;
      organizationId: string;
      memberNumber: string | null;
      role: string;
    },
  ): Promise<MemberEntity> {
    const [row] = await this.db
      .insert(member)
      .values({
        userId: params.userId,
        organizationId: params.organizationId,
        memberNumber: params.memberNumber ?? undefined,
        role: params.role,
        createdAt: new Date(),
      })
      .returning();

    const memberWithUser = await this.findById(_ctx, row.id);
    if (!memberWithUser) throw new Error("Failed to retrieve created member");
    return memberWithUser;
  }

  async update(
    _ctx: UserContext,
    memberId: string,
    params: { memberNumber?: string | null; role?: string },
  ): Promise<MemberEntity> {
    const updates: Record<string, unknown> = {};
    if (params.memberNumber !== undefined) updates.memberNumber = params.memberNumber;
    if (params.role !== undefined) updates.role = params.role;

    await this.db.update(member).set(updates).where(eq(member.id, memberId));

    const updated = await this.findById(_ctx, memberId);
    if (!updated) throw new Error("Member not found after update");
    return updated;
  }

  async remove(_ctx: UserContext, memberId: string): Promise<void> {
    await this.db.delete(member).where(eq(member.id, memberId));
  }

  async findUserByEmail(_ctx: UserContext, email: string) {
    return this.db.query.user.findFirst({ where: eq(user.email, email) });
  }

  async createUser(_ctx: UserContext, params: { name: string; email: string }) {
    const [row] = await this.db
      .insert(user)
      .values({
        name: params.name,
        email: params.email,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return row;
  }
}
