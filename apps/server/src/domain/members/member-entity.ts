import { type member, type user } from "@photo-salon/database/schema";
import { type InferSelectModel } from "drizzle-orm";

type MemberModel = InferSelectModel<typeof member>;
type UserModel = InferSelectModel<typeof user>;

export class MemberEntity {
  private constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly organizationId: string,
    public readonly memberNumber: string | null,
    public readonly role: string,
    public readonly createdAt: Date,
    public readonly user: {
      id: string;
      name: string;
      email: string;
    }
  ) {}

  static fromModels(memberModel: MemberModel, userModel: UserModel): MemberEntity {
    return new MemberEntity(
      memberModel.id,
      memberModel.userId,
      memberModel.organizationId,
      memberModel.memberNumber ?? null,
      memberModel.role,
      memberModel.createdAt,
      {
        id: userModel.id,
        name: userModel.name,
        email: userModel.email,
      }
    );
  }
}
