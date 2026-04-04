import { type Database } from "@photo-salon/database";
import { dbSymbol, di } from "@/lib/di.ts";
import { base, authenticatedRoute, authorizedRoute } from "./base.ts";
import { userController } from "@/controllers/user-controller.ts";
import { memberController } from "@/controllers/member-controller.ts";
import { salonTemplateController } from "@/controllers/salon-template-controller.ts";
import { onboardingController } from "@/controllers/onboarding-controller.ts";
import { salonController } from "@/controllers/salon-controller.ts";

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

const listMembers = authorizedRoute.member.list.handler(async ({ input, context }) => {
  return memberController.listMembers(context, context.domain, input);
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

const listTemplates = authorizedRoute.salonTemplate.list.handler(async ({ input, context }) => {
  return salonTemplateController.listTemplates(context, context.domain, input);
});

const getTemplate = authorizedRoute.salonTemplate.get.handler(async ({ input, context }) => {
  return salonTemplateController.getTemplate(context, context.domain, input.templateId);
});

const createTemplate = authorizedRoute.salonTemplate.create.handler(async ({ input, context }) => {
  return salonTemplateController.createTemplate(context, context.domain, input);
});

const updateTemplate = authorizedRoute.salonTemplate.update.handler(async ({ input, context }) => {
  return salonTemplateController.updateTemplate(context, context.domain, input);
});

const deleteTemplate = authorizedRoute.salonTemplate.delete.handler(async ({ input, context }) => {
  return salonTemplateController.deleteTemplate(context, context.domain, input.templateId);
});

const addCriterion = authorizedRoute.salonTemplate.addCriterion.handler(async ({ input, context }) => {
  return salonTemplateController.addCriterion(context, context.domain, input);
});

const updateCriterion = authorizedRoute.salonTemplate.updateCriterion.handler(async ({ input, context }) => {
  return salonTemplateController.updateCriterion(context, context.domain, input);
});

const removeCriterion = authorizedRoute.salonTemplate.removeCriterion.handler(async ({ input, context }) => {
  return salonTemplateController.removeCriterion(context, context.domain, input.criterionId);
});

const addSlot = authorizedRoute.salonTemplate.addSlot.handler(async ({ input, context }) => {
  return salonTemplateController.addSlot(context, context.domain, input);
});

const updateSlot = authorizedRoute.salonTemplate.updateSlot.handler(async ({ input, context }) => {
  return salonTemplateController.updateSlot(context, context.domain, input);
});

const removeSlot = authorizedRoute.salonTemplate.removeSlot.handler(async ({ input, context }) => {
  return salonTemplateController.removeSlot(context, context.domain, input.slotId);
});

const onboardingConfig = authorizedRoute.onboarding.config.handler(async ({ context }) => {
  return onboardingController.getConfig(context, context.domain);
});

const createCheckout = authorizedRoute.onboarding.createCheckout.handler(async ({ input, context }) => {
  return onboardingController.createCheckout(context, context.domain, input);
});

const createFreeOrg = authorizedRoute.onboarding.createFreeOrg.handler(async ({ input, context }) => {
  return onboardingController.createFreeOrg(context, context.domain, input);
});

const listSalons = authorizedRoute.salon.list.handler(async ({ input, context }) => {
  return salonController.listSalons(context, context.domain, input);
});

const getSalon = authorizedRoute.salon.get.handler(async ({ input, context }) => {
  return salonController.getSalon(context, context.domain, input.salonId);
});

const createSalon = authorizedRoute.salon.create.handler(async ({ input, context }) => {
  return salonController.createSalon(context, context.domain, input);
});

const updateSalon = authorizedRoute.salon.update.handler(async ({ input, context }) => {
  return salonController.updateSalon(context, context.domain, input);
});

const transitionSalon = authorizedRoute.salon.transition.handler(async ({ input, context }) => {
  return salonController.transitionSalon(context, context.domain, input);
});

const deleteSalon = authorizedRoute.salon.delete.handler(async ({ input, context }) => {
  return salonController.deleteSalon(context, context.domain, input.salonId);
});

const addSalonCriterion = authorizedRoute.salon.addCriterion.handler(async ({ input, context }) => {
  return salonController.addCriterion(context, context.domain, input);
});

const updateSalonCriterion = authorizedRoute.salon.updateCriterion.handler(async ({ input, context }) => {
  return salonController.updateCriterion(context, context.domain, input);
});

const removeSalonCriterion = authorizedRoute.salon.removeCriterion.handler(async ({ input, context }) => {
  return salonController.removeCriterion(context, context.domain, input.criterionId);
});

const addCategory = authorizedRoute.salon.addCategory.handler(async ({ input, context }) => {
  return salonController.addCategory(context, context.domain, input);
});

const updateCategory = authorizedRoute.salon.updateCategory.handler(async ({ input, context }) => {
  return salonController.updateCategory(context, context.domain, input);
});

const removeCategory = authorizedRoute.salon.removeCategory.handler(async ({ input, context }) => {
  return salonController.removeCategory(context, context.domain, input.categoryId);
});

export const routerImplementation = base.router({
  healthy,
  currentUser: {
    me: currentUser,
  },
  onboarding: {
    config: onboardingConfig,
    createCheckout,
    createFreeOrg,
  },
  salon: {
    list: listSalons,
    get: getSalon,
    create: createSalon,
    update: updateSalon,
    transition: transitionSalon,
    delete: deleteSalon,
    addCriterion: addSalonCriterion,
    updateCriterion: updateSalonCriterion,
    removeCriterion: removeSalonCriterion,
    addCategory,
    updateCategory,
    removeCategory,
  },
  member: {
    list: listMembers,
    add: addMember,
    update: updateMember,
    remove: removeMember,
  },
  salonTemplate: {
    list: listTemplates,
    get: getTemplate,
    create: createTemplate,
    update: updateTemplate,
    delete: deleteTemplate,
    addCriterion,
    updateCriterion,
    removeCriterion,
    addSlot,
    updateSlot,
    removeSlot,
  },
});
