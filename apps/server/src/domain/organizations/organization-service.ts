import { inject, injectable } from "inversify";
import { eq } from "drizzle-orm";
import { type Database } from "@photo-salon/database";
import { organization, member } from "@photo-salon/database/schema";
import { dbSymbol } from "@/lib/symbols.ts";
import { type Context } from "@/lib/context.ts";

export interface CreateOrgResult {
  organizationId: string;
  slug: string;
}

@injectable()
export class OrganizationService {
  constructor(@inject(dbSymbol) private db: Database) {}

  async createOrganization(
    _ctx: Context,
    params: {
      name: string;
      slug: string;
      userId: string;
    },
  ): Promise<CreateOrgResult> {
    const [org] = await this.db
      .insert(organization)
      .values({
        id: crypto.randomUUID(),
        name: params.name,
        slug: params.slug,
        createdAt: new Date(),
      })
      .returning();

    await this.db.insert(member).values({
      id: crypto.randomUUID(),
      organizationId: org.id,
      userId: params.userId,
      role: "admin",
      createdAt: new Date(),
    });

    return { organizationId: org.id, slug: org.slug };
  }

  async findBySlug(_ctx: Context, slug: string) {
    return this.db.query.organization.findFirst({
      where: eq(organization.slug, slug),
    });
  }

  async findUserOrganizations(_ctx: Context, userId: string) {
    const memberships = await this.db.query.member.findMany({
      where: eq(member.userId, userId),
    });
    return memberships;
  }
}
