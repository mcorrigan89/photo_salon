import { ORPCError } from "@orpc/server";
import { type UserContext } from "@/lib/context.ts";
import { type AppDomain } from "@/domain/domain.ts";
import { type OnboardingConfigDto } from "@photo-salon/contract";

function requireUserId(ctx: UserContext): string {
  if (!ctx.currentUserId) throw new ORPCError("FORBIDDEN");
  return ctx.currentUserId;
}

export class OnboardingController {
  async getConfig(ctx: UserContext, domain: AppDomain): Promise<OnboardingConfigDto> {
    const userId = requireUserId(ctx);
    const config = await domain.onboardingService.getConfig();
    const hasOrganization = await domain.onboardingService.hasOrganization(ctx, userId);
    return { ...config, hasOrganization };
  }

  async createCheckout(
    ctx: UserContext,
    domain: AppDomain,
    input: { clubName: string; plan: "monthly" | "yearly" },
  ): Promise<{ checkoutUrl: string }> {
    const userId = requireUserId(ctx);
    const email = ctx.user?.email;
    if (!email) throw new ORPCError("FORBIDDEN");
    ctx.logger.info("Creating Polar checkout", input.plan, input.clubName);
    const result = await domain.onboardingService.createCheckout(ctx, { ...input, userId, email });
    ctx.logger.info("Polar checkout created", result.checkoutUrl);
    return result;
  }

  async createFreeOrg(
    ctx: UserContext,
    domain: AppDomain,
    input: { clubName: string },
  ): Promise<{ organizationId: string; slug: string }> {
    const userId = requireUserId(ctx);
    return domain.onboardingService.createFreeOrg(ctx, { clubName: input.clubName, userId });
  }
}

export const onboardingController = new OnboardingController();
