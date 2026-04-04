import { oc } from "@orpc/contract";
import { z } from "zod";

export const memberDto = z.object({
  id: z.string(),
  userId: z.string(),
  organizationId: z.string(),
  memberNumber: z.string().nullable(),
  role: z.string(),
  createdAt: z.date(),
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
  }),
});

export type MemberDto = z.infer<typeof memberDto>;

export const listMembersRoute = oc
  .input(z.object({ organizationId: z.string() }))
  .output(z.array(memberDto));

export const addMemberRoute = oc
  .input(
    z.object({
      organizationId: z.string(),
      name: z.string().min(1),
      email: z.string().email(),
      memberNumber: z.string().min(1).nullable(),
      role: z.enum(["admin", "judge", "member"]),
    }),
  )
  .output(memberDto);

export const updateMemberRoute = oc
  .input(
    z.object({
      memberId: z.string(),
      memberNumber: z.string().min(1).nullable().optional(),
      role: z.enum(["admin", "judge", "member"]).optional(),
    }),
  )
  .output(memberDto);

export const removeMemberRoute = oc
  .input(z.object({ memberId: z.string() }))
  .output(z.object({ success: z.boolean() }));
