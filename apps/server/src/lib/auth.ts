import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, magicLink, organization, testUtils } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { fromPromise } from "neverthrow";
import { createDatabase, type Database } from "@photo-salon/database";
import { member, session as sessionTable } from "@photo-salon/database/schema";
import { getServerEnv } from "@photo-salon/env/server";
import { getSharedEnv } from "@photo-salon/env/shared";
import { di } from "./di-container.ts";
import { dbSymbol } from "./symbols.ts";
import { notificationBus } from "./notification-bus.ts";
import { EmailService } from "../domain/email/email-service.ts";
import { createEventContext } from "./context.ts";

const toError = (e: unknown) => (e instanceof Error ? e : new Error(String(e)));

async function getActiveOrganization(userId: string) {
  const db = di.get<Database>(dbSymbol);

  const sessionResult = await fromPromise(
    db.query.session.findFirst({
      where: and(eq(sessionTable.userId, userId), isNotNull(sessionTable.activeOrganizationId)),
      orderBy: desc(sessionTable.createdAt),
    }),
    toError,
  );
  if (sessionResult.isErr()) throw sessionResult.error;
  const previousSession = sessionResult.value;

  if (previousSession?.activeOrganizationId) {
    const memberResult = await fromPromise(
      db.query.member.findFirst({
        where: and(
          eq(member.userId, userId),
          eq(member.organizationId, previousSession.activeOrganizationId),
        ),
      }),
      toError,
    );
    if (memberResult.isErr()) throw memberResult.error;
    if (memberResult.value) {
      return previousSession.activeOrganizationId;
    }
  }

  const recentResult = await fromPromise(
    db.query.member.findFirst({
      where: eq(member.userId, userId),
      orderBy: desc(member.createdAt),
    }),
    toError,
  );
  if (recentResult.isErr()) throw recentResult.error;

  return recentResult.value?.organizationId || null;
}

const auth = betterAuth({
  database: drizzleAdapter(createDatabase(getServerEnv().DATABASE_URL), {
    provider: "pg",
  }),
  baseURL: getSharedEnv().SERVER_URL,
  trustedOrigins: () => {
    const env = getSharedEnv();
    return [env.CLIENT_URL, env.SERVER_URL];
  },
  plugins: [
    tanstackStartCookies(),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        if (getSharedEnv().NODE_ENV === "development") {
          await notificationBus.publish("notification", {
            type: "link",
            message: `Magic link for ${email}`,
            description: "Click to login",
            link: url,
          });
        }

        const ctx = createEventContext();
        await di.get<EmailService>(EmailService).send(ctx, {
          to: email,
          subject: "Your sign in link",
          htmlBody: `<p>Click the link below to sign in:</p><p><a href="${url}">${url}</a></p><p>This link expires shortly.</p>`,
          textBody: `Click the link below to sign in:\n\n${url}\n\nThis link expires shortly.`,
        });
      },
    }),
    organization({
      sendInvitationEmail: async () => {
        // Invitations handled via oRPC inviteMember route
      },
    }),
    admin(),
  ],
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const activeOrgId = await getActiveOrganization(session.userId);
          return {
            data: {
              ...session,
              activeOrganizationId: activeOrgId,
            },
          };
        },
      },
    },
  },
  advanced: {
    database: {
      generateId: () => crypto.randomUUID(),
    },
    crossSubDomainCookies: {
      enabled: getSharedEnv().NODE_ENV === "production",
      domain: (() => {
        const host = new URL(getSharedEnv().SERVER_URL).hostname;
        const parts = host.split(".");
        return parts.length > 1 ? `.${parts.slice(-2).join(".")}` : undefined;
      })(),
    },
  },
});

export { auth };
export type AuthService = typeof auth;
export type Session = typeof auth.$Infer.Session;

export function createTestAuth(db: Database) {
  return betterAuth({
    database: drizzleAdapter(db, { provider: "pg" }),
    baseURL: getSharedEnv().SERVER_URL,
    plugins: [
      tanstackStartCookies(),
      organization({ sendInvitationEmail: async () => {} }),
      admin(),
      testUtils(),
    ],
    advanced: {
      database: { generateId: () => crypto.randomUUID() },
    },
  });
}
