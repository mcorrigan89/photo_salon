import { type Database } from "@photo-salon/database";
import { dbSymbol, di } from "@/lib/di.ts";
import { base, authenticatedRoute } from "./base.ts";
import { userController } from "@/controllers/user-controller.ts";

const healthy = base.healthy.handler(async () => {
  const db = di.get<Database>(dbSymbol);
  try {
    await db.execute("SELECT 1");
    return "OK";
  } catch {
    return "Database connection failed";
  }
});

const currentUser = authenticatedRoute.currentUser.me.handler(async ({ context }) => {
  return userController.currentUser(context, context.domain);
});

export const routerImplementation = base.router({
  healthy,
  currentUser: {
    me: currentUser,
  },
});
