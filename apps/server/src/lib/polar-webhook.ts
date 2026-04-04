import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";
import { getServerEnv } from "@photo-salon/env/server";
import { logger } from "@photo-salon/logger";
import { di } from "./di-container.ts";
import { OrganizationService } from "@/domain/organizations/organization-service.ts";
import { createEventContext } from "./context.ts";

export async function handlePolarWebhook(request: Request): Promise<Response> {
  const env = getServerEnv();
  const body = await request.text();

  let event: { type: string; data: Record<string, unknown> };
  try {
    event = validateEvent(
      body,
      Object.fromEntries(request.headers.entries()),
      env.POLAR_WEBHOOK_SECRET,
    ) as { type: string; data: Record<string, unknown> };
  } catch (e) {
    if (e instanceof WebhookVerificationError) {
      logger.warn("Polar webhook signature verification failed");
      return new Response("Invalid signature", { status: 403 });
    }
    throw e;
  }

  logger.info(`Polar webhook received: ${event.type}`);

  if (event.type === "subscription.active") {
    await handleSubscriptionActive(event.data);
  }

  return new Response("OK", { status: 200 });
}

async function handleSubscriptionActive(data: Record<string, unknown>) {
  const metadata = data.metadata as Record<string, string> | undefined;
  if (!metadata?.userId || !metadata?.clubName || !metadata?.clubSlug) {
    logger.warn("Polar subscription.active webhook missing metadata");
    return;
  }

  const ctx = createEventContext();
  const orgService = di.get(OrganizationService);

  // Idempotency: skip if org already exists
  const existing = await orgService.findBySlug(ctx, metadata.clubSlug);
  if (existing) {
    logger.info(`Org already exists for slug ${metadata.clubSlug}, skipping creation`);
    return;
  }

  const result = await orgService.createOrganization(ctx, {
    name: metadata.clubName,
    slug: metadata.clubSlug,
    userId: metadata.userId,
  });

  logger.info(`Created org ${result.organizationId} (${metadata.clubName}) via Polar subscription`);
}
