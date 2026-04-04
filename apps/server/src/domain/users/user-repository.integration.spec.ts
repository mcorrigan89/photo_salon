import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createPgliteDb, type TestDatabase } from "@/test/pglite-db.ts";
import { UserRepository } from "./user-repository.ts";
import { UserEntity } from "./user-entity.ts";

const ctx = {} as Parameters<UserRepository["findById"]>[0];

let testDb: TestDatabase;
let repo: UserRepository;

beforeAll(async () => {
  testDb = await createPgliteDb();
  repo = new UserRepository(testDb.db);
});

afterAll(async () => {
  await testDb.cleanup();
});

// ── save ──────────────────────────────────────────────────────────────────────

describe("save", () => {
  it("creates a new user when the id is not in the database", async () => {
    const entity = UserEntity.create({ name: "Alice Smith", email: "alice@example.com" });
    const saved = await repo.save(ctx, entity);

    expect(saved).toBeInstanceOf(UserEntity);
    expect(saved.id).toBe(entity.id);
    expect(saved.name).toBe("Alice Smith");
    expect(saved.email).toBe("alice@example.com");
    expect(saved.emailVerified).toBe(false);
    expect(saved.role).toBeNull();
  });

  it("updates an existing user when saved again with with()", async () => {
    const entity = UserEntity.create({ name: "Bob Jones", email: "bob@example.com" });
    await repo.save(ctx, entity);

    const updated = await repo.save(ctx, entity.with({ name: "Robert Jones" }));

    expect(updated.id).toBe(entity.id);
    expect(updated.name).toBe("Robert Jones");
    expect(updated.email).toBe("bob@example.com");
  });

  it("returns the persisted entity with correct fields", async () => {
    const entity = UserEntity.create({ name: "Carol White", email: "carol@example.com" });
    const saved = await repo.save(ctx, entity);

    expect(saved.createdAt).toBeInstanceOf(Date);
    expect(saved.initials).toBe("CW");
  });
});

// ── findById ──────────────────────────────────────────────────────────────────

describe("findById", () => {
  it("returns null for a non-existent id", async () => {
    const result = await repo.findById(ctx, "00000000-0000-0000-0000-000000000000");
    expect(result).toBeNull();
  });

  it("returns the user entity for an existing id", async () => {
    const entity = UserEntity.create({ name: "Dave Brown", email: "dave@example.com" });
    await repo.save(ctx, entity);

    const found = await repo.findById(ctx, entity.id);

    expect(found).not.toBeNull();
    expect(found!.id).toBe(entity.id);
    expect(found!.name).toBe("Dave Brown");
  });
});

// ── findByEmail ───────────────────────────────────────────────────────────────

describe("findByEmail", () => {
  it("returns null when no user has that email", async () => {
    const result = await repo.findByEmail(ctx, "nobody@example.com");
    expect(result).toBeNull();
  });

  it("returns the user entity matching the email", async () => {
    const entity = UserEntity.create({ name: "Eve Green", email: "eve@example.com" });
    await repo.save(ctx, entity);

    const found = await repo.findByEmail(ctx, "eve@example.com");

    expect(found).not.toBeNull();
    expect(found!.id).toBe(entity.id);
    expect(found!.name).toBe("Eve Green");
  });

  it("is case-sensitive", async () => {
    const entity = UserEntity.create({ name: "Frank Lee", email: "frank@example.com" });
    await repo.save(ctx, entity);

    const result = await repo.findByEmail(ctx, "FRANK@EXAMPLE.COM");
    expect(result).toBeNull();
  });
});

// ── initials computed property ────────────────────────────────────────────────

describe("UserEntity.initials", () => {
  it("returns up to two uppercase initials", async () => {
    const entity = UserEntity.create({ name: "Grace Hall", email: "grace@example.com" });
    expect(entity.initials).toBe("GH");
  });

  it("handles single-word names", async () => {
    const entity = UserEntity.create({ name: "Cher", email: "cher@example.com" });
    expect(entity.initials).toBe("C");
  });

  it("caps at two characters for long names", async () => {
    const entity = UserEntity.create({ name: "Mary Jane Watson", email: "mj@example.com" });
    expect(entity.initials).toBe("MJ");
  });
});
