import { type AuthService } from "@/lib/auth.ts";
import { type UserContext } from "@/lib/context.ts";
import { di, authSymbol } from "@/lib/di.ts";
import { implement, ORPCError } from "@orpc/server";
import { contract } from "@photo-salon/contract";

const os = implement(contract);
export const base = os.$context<UserContext>();

const authenticatedMiddleware = base.middleware(async ({ context, next }) => {
  const auth = di.get<AuthService>(authSymbol);
  const sessionData = await auth.api.getSession({ headers: context.headers });

  context.logger.setUserContext({
    ...context,
    session: sessionData?.session,
    user: sessionData?.user,
    currentUserId: sessionData?.user?.id ?? null,
  });

  return next({
    context: {
      session: sessionData?.session,
      user: sessionData?.user,
      currentUserId: sessionData?.user?.id ?? null,
    },
  });
});

const authorizedMiddleware = base.middleware(async ({ context, next }) => {
  if (!context.user) {
    throw new ORPCError("FORBIDDEN");
  }
  return next();
});

const adminMiddleware = base.middleware(async ({ context, next }) => {
  if (context.user?.role !== "admin") {
    throw new ORPCError("FORBIDDEN");
  }
  return next();
});

export const publicRoute = base;
export const authenticatedRoute = publicRoute.use(authenticatedMiddleware);
export const authorizedRoute = authenticatedRoute.use(authorizedMiddleware);
export const adminRoute = authorizedRoute.use(adminMiddleware);
