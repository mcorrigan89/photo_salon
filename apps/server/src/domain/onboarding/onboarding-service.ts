import { inject, injectable } from "inversify";
import { ORPCError } from "@orpc/server";
import { getServerEnv } from "@photo-salon/env/server";
import { getSharedEnv } from "@photo-salon/env/shared";
import { type UserContext } from "@/lib/context.ts";
import { getPolar } from "@/lib/polar.ts";
import { OrganizationService, type CreateOrgResult } from "@/domain/organizations/organization-service.ts";

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

@injectable()
export class OnboardingService {
  constructor(
    @inject(OrganizationService) private orgService: OrganizationService,
  ) {}

  async getConfig(): Promise<{
    polarEnabled: boolean;
    monthlyPrice: number;
    yearlyPrice: number;
  }> {
    const env = getServerEnv();
    return {
      polarEnabled: env.POLAR_ENABLED,
      monthlyPrice: 2000,
      yearlyPrice: 20000,
    };
  }

  async createCheckout(
    ctx: UserContext,
    params: { clubName: string; plan: "monthly" | "yearly"; userId: string; email: string },
  ): Promise<{ checkoutUrl: string }> {
    const env = getServerEnv();

    if (!env.POLAR_ENABLED) {
      throw new ORPCError("BAD_REQUEST", { message: "Polar is not enabled." });
    }

    const productId =
      params.plan === "monthly" ? env.POLAR_MONTHLY_PRODUCT_ID : env.POLAR_YEARLY_PRODUCT_ID;

    const slug = toSlug(params.clubName);

    // Verify slug is unique
    const existing = await this.orgService.findBySlug(ctx, slug);
    if (existing) {
      throw new ORPCError("CONFLICT", { message: "A club with that name already exists." });
    }

    const polar = getPolar();
    const successUrl = `${getSharedEnv().CLIENT_URL}/onboarding/success?checkout_id={CHECKOUT_ID}`;

    ctx.logger.info("Calling Polar checkouts.create", productId, slug, params.email);

    let checkout;
    try {
      checkout = await polar.checkouts.create({
        products: [productId],
        successUrl,
        customerEmail: params.email,
        metadata: {
          userId: params.userId,
          clubName: params.clubName,
          clubSlug: slug,
        },
      });
    } catch (err) {
      ctx.logger.error(err instanceof Error ? err : new Error(String(err)));
      throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Failed to create checkout." });
    }

    ctx.logger.info("Polar checkout created", checkout.id, checkout.url);
    return { checkoutUrl: checkout.url };
  }

  async createFreeOrg(
    ctx: UserContext,
    params: { clubName: string; userId: string },
  ): Promise<CreateOrgResult> {
    ctx.logger.info("Creating free org", params.clubName, params.userId);
    const env = getServerEnv();
    if (env.POLAR_ENABLED) {
      throw new ORPCError("BAD_REQUEST", { message: "Free org creation is disabled when Polar is enabled." });
    }

    const slug = toSlug(params.clubName);

    const existing = await this.orgService.findBySlug(ctx, slug);
    if (existing) {
      ctx.logger.warn("Club name already taken", slug);
      throw new ORPCError("CONFLICT", { message: "A club with that name already exists." });
    }

    const result = await this.orgService.createOrganization(ctx, {
      name: params.clubName,
      slug,
      userId: params.userId,
    });
    ctx.logger.info("Free org created", result.organizationId, result.slug);
    return result;
  }

  async hasOrganization(ctx: UserContext, userId: string): Promise<boolean> {
    const memberships = await this.orgService.findUserOrganizations(ctx, userId);
    ctx.logger.trace("hasOrganization check", userId, memberships.length > 0);
    return memberships.length > 0;
  }
}
