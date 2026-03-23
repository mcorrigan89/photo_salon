import { type user } from "@photo-salon/database/schema";
import { type InferSelectModel } from "drizzle-orm";

type UserModel = InferSelectModel<typeof user>;

export class UserEntity {
  private constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly email: string,
    public readonly emailVerified: boolean,
    public readonly role: string | null,
    public readonly createdAt: Date,
  ) {}

  get initials(): string {
    return this.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  static fromModel(model: UserModel): UserEntity {
    return new UserEntity(
      model.id,
      model.name,
      model.email,
      model.emailVerified,
      model.role ?? null,
      model.createdAt,
    );
  }
}
