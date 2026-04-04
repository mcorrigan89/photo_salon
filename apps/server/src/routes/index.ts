import { type Database } from "@photo-salon/database";
import { dbSymbol, di } from "@/lib/di.ts";
import { base, authenticatedRoute, authorizedRoute } from "./base.ts";
import { userController } from "@/controllers/user-controller.ts";
import { memberController } from "@/controllers/member-controller.ts";

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

const listMembers = authorizedRoute.member.list.handler(async ({ context }) => {
  return memberController.listMembers(context, context.domain);
});

const addMember = authorizedRoute.member.add.handler(async ({ input, context }) => {
  return memberController.addMember(context, context.domain, input);
});

const updateMember = authorizedRoute.member.update.handler(async ({ input, context }) => {
  return memberController.updateMember(context, context.domain, input);
});

const removeMember = authorizedRoute.member.remove.handler(async ({ input, context }) => {
  return memberController.removeMember(context, context.domain, input.memberId);
});

export const routerImplementation = base.router({
  healthy,
  currentUser: {
    me: currentUser,
  },
  member: {
    list: listMembers,
    add: addMember,
    update: updateMember,
    remove: removeMember,
  },
});
