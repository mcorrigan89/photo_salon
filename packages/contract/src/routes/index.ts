import {
  oc,
  type InferContractRouterInputs,
  type InferContractRouterOutputs,
} from "@orpc/contract";
import { z } from "zod";
import { currentUserRoute } from "./auth-routes.ts";
import {
  listMembersRoute,
  addMemberRoute,
  updateMemberRoute,
  removeMemberRoute,
} from "./member-routes.ts";
import {
  listTemplatesRoute,
  getTemplateRoute,
  createTemplateRoute,
  updateTemplateRoute,
  deleteTemplateRoute,
  addCriterionRoute,
  updateCriterionRoute,
  removeCriterionRoute,
  addSlotRoute,
  updateSlotRoute,
  removeSlotRoute,
} from "./salon-template-routes.ts";

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
  salonTemplate: {
    list: listTemplatesRoute,
    get: getTemplateRoute,
    create: createTemplateRoute,
    update: updateTemplateRoute,
    delete: deleteTemplateRoute,
    addCriterion: addCriterionRoute,
    updateCriterion: updateCriterionRoute,
    removeCriterion: removeCriterionRoute,
    addSlot: addSlotRoute,
    updateSlot: updateSlotRoute,
    removeSlot: removeSlotRoute,
  },
};

export type Inputs = InferContractRouterInputs<typeof contract>;
export type Outputs = InferContractRouterOutputs<typeof contract>;
