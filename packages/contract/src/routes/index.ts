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
import {
  getOnboardingConfigRoute,
  createCheckoutRoute,
  createFreeOrgRoute,
} from "./onboarding-routes.ts";
import {
  listSalonsRoute,
  getSalonRoute,
  createSalonRoute,
  updateSalonRoute,
  transitionSalonRoute,
  deleteSalonRoute,
  addSalonCriterionRoute,
  updateSalonCriterionRoute,
  removeSalonCriterionRoute,
  addCategoryRoute,
  updateCategoryRoute,
  removeCategoryRoute,
} from "./salon-routes.ts";
import {
  listMySubmissionsRoute,
  listAllMySubmissionsRoute,
  submitPrintRoute,
  withdrawSubmissionRoute,
  getSalonSubmissionSummaryRoute,
} from "./submission-routes.ts";

const healthy = oc.output(z.string());

export const contract = {
  healthy,
  currentUser: {
    me: currentUserRoute,
  },
  onboarding: {
    config: getOnboardingConfigRoute,
    createCheckout: createCheckoutRoute,
    createFreeOrg: createFreeOrgRoute,
  },
  member: {
    list: listMembersRoute,
    add: addMemberRoute,
    update: updateMemberRoute,
    remove: removeMemberRoute,
  },
  salon: {
    list: listSalonsRoute,
    get: getSalonRoute,
    create: createSalonRoute,
    update: updateSalonRoute,
    transition: transitionSalonRoute,
    delete: deleteSalonRoute,
    addCriterion: addSalonCriterionRoute,
    updateCriterion: updateSalonCriterionRoute,
    removeCriterion: removeSalonCriterionRoute,
    addCategory: addCategoryRoute,
    updateCategory: updateCategoryRoute,
    removeCategory: removeCategoryRoute,
  },
  submission: {
    listMine: listMySubmissionsRoute,
    listAll: listAllMySubmissionsRoute,
    submitPrint: submitPrintRoute,
    withdraw: withdrawSubmissionRoute,
    salonSummary: getSalonSubmissionSummaryRoute,
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
