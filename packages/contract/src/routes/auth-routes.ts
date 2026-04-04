import { oc } from "@orpc/contract";
import { z } from "zod";

export const currentUserDto = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  role: z.string().nullable(),
  activeOrganization: z
    .object({
      id: z.string(),
      name: z.string(),
      memberRole: z.string(),
    })
    .nullable(),
  session: z.object({
    id: z.string(),
    createdAt: z.date(),
    expiresAt: z.date(),
    userAgent: z.string().nullable(),
    ipAddress: z.string().nullable(),
  }),
});

export type CurrentUserDto = z.infer<typeof currentUserDto>;

export const currentUserRoute = oc.output(currentUserDto.nullable());
