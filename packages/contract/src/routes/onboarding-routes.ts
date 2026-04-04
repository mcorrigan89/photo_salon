import { oc } from "@orpc/contract";
import { z } from "zod";

export const onboardingConfigDto = z.object({
  polarEnabled: z.boolean(),
  monthlyPrice: z.number(),
  yearlyPrice: z.number(),
  hasOrganization: z.boolean(),
});

export type OnboardingConfigDto = z.infer<typeof onboardingConfigDto>;

export const getOnboardingConfigRoute = oc.output(onboardingConfigDto);

export const createCheckoutRoute = oc
  .input(
    z.object({
      clubName: z.string().min(1).max(100),
      plan: z.enum(["monthly", "yearly"]),
    }),
  )
  .output(z.object({ checkoutUrl: z.string() }));

export const createFreeOrgRoute = oc
  .input(
    z.object({
      clubName: z.string().min(1).max(100),
    }),
  )
  .output(z.object({ organizationId: z.string(), slug: z.string() }));
