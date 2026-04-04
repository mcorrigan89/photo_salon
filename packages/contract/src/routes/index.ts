import { oc, type InferContractRouterInputs, type InferContractRouterOutputs } from "@orpc/contract";
import { z } from "zod";
import { currentUserRoute } from "./auth-routes.ts";
import {
  listMembersRoute,
  addMemberRoute,
  updateMemberRoute,
  removeMemberRoute,
} from "./member-routes.ts";

const healthy = oc.output(z.string());

export const contract = {
  healthy,
  currentUser: {
    me: currentUserRoute,
  },
  member: {
    list: listMembersRoute,
    add: addMemberRoute,
    update: updateMemberRoute,
    remove: removeMemberRoute,
  },
};

export type Inputs = InferContractRouterInputs<typeof contract>;
export type Outputs = InferContractRouterOutputs<typeof contract>;
