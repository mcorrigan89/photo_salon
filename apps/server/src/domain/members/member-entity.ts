import { type member } from "@photo-salon/database/schema";
import { type InferSelectModel } from "drizzle-orm";
import { type UserEntity } from "@/domain/users/user-entity.ts";

type MemberModel = InferSelectModel<typeof member>;

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
    },
  ) {}

  static create(params: {
    userId: string;
    organizationId: string;
    memberNumber: string | null;
    role: string;
    user: { id: string; name: string; email: string };
  }): MemberEntity {
    return new MemberEntity(
      crypto.randomUUID(),
      params.userId,
      params.organizationId,
      params.memberNumber,
      params.role,
      new Date(),
      params.user,
    );
  }

  static fromModels(memberModel: MemberModel, userEntity: UserEntity): MemberEntity {
    return new MemberEntity(
      memberModel.id,
      memberModel.userId,
      memberModel.organizationId,
      memberModel.memberNumber ?? null,
      memberModel.role,
      memberModel.createdAt,
      {
        id: userEntity.id,
        name: userEntity.name,
        email: userEntity.email,
      },
    );
  }

  with(params: { memberNumber?: string | null; role?: string }): MemberEntity {
    return new MemberEntity(
      this.id,
      this.userId,
      this.organizationId,
      params.memberNumber !== undefined ? params.memberNumber : this.memberNumber,
      params.role ?? this.role,
      this.createdAt,
      this.user,
    );
  }
}
