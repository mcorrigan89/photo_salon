import { oc, type InferContractRouterInputs, type InferContractRouterOutputs } from "@orpc/contract";
import { z } from "zod";
import { currentUserRoute } from "./auth-routes.ts";

const healthy = oc.output(z.string());

export const contract = {
  healthy,
  currentUser: {
    me: currentUserRoute,
  },
};

export type Inputs = InferContractRouterInputs<typeof contract>;
export type Outputs = InferContractRouterOutputs<typeof contract>;
