import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { organization } from "@photo-salon/database/schema";
import { createPgliteDb, type TestDatabase } from "@/test/pglite-db.ts";
import { UserRepository } from "@/domain/users/user-repository.ts";
import { UserEntity } from "@/domain/users/user-entity.ts";
import { MemberRepository } from "./member-repository.ts";
import { MemberEntity } from "./member-entity.ts";

const ctx = {} as Parameters<MemberRepository["findById"]>[0];

let testDb: TestDatabase;
let memberRepo: MemberRepository;
let userRepo: UserRepository;
let orgId: string;
let otherOrgId: string;

// Shared user fixtures — created once and reused across describe blocks
let userAlice: UserEntity;
let userBob: UserEntity;

beforeAll(async () => {
  testDb = await createPgliteDb();
  memberRepo = new MemberRepository(testDb.db);
  userRepo = new UserRepository(testDb.db);

  const [org, otherOrg] = await testDb.db
    .insert(organization)
    .values([
      { name: "Photo Club", slug: "photo-club", createdAt: new Date() },
      { name: "Other Club", slug: "other-club", createdAt: new Date() },
    ])
    .returning();
  orgId = org.id;
  otherOrgId = otherOrg.id;

  userAlice = await userRepo.save(ctx, UserEntity.create({ name: "Alice", email: "alice@club.com" }));
  userBob = await userRepo.save(ctx, UserEntity.create({ name: "Bob", email: "bob@club.com" }));
});

afterAll(async () => {
  await testDb.cleanup();
});

// ── save (create) ─────────────────────────────────────────────────────────────

describe("save (create)", () => {
  it("inserts a new member and returns the full entity with user data", async () => {
    const entity = MemberEntity.create({
      userId: userAlice.id,
      organizationId: orgId,
      memberNumber: "001",
      role: "member",
      user: { id: userAlice.id, name: userAlice.name, email: userAlice.email },
    });

    const saved = await memberRepo.save(ctx, entity);

    expect(saved).toBeInstanceOf(MemberEntity);
    expect(saved.id).toBe(entity.id);
    expect(saved.userId).toBe(userAlice.id);
    expect(saved.organizationId).toBe(orgId);
    expect(saved.memberNumber).toBe("001");
    expect(saved.role).toBe("member");
    expect(saved.user.name).toBe("Alice");
    expect(saved.user.email).toBe("alice@club.com");
  });

  it("accepts a null memberNumber", async () => {
    const entity = MemberEntity.create({
      userId: userBob.id,
      organizationId: orgId,
      memberNumber: null,
      role: "judge",
      user: { id: userBob.id, name: userBob.name, email: userBob.email },
    });

    const saved = await memberRepo.save(ctx, entity);

    expect(saved.memberNumber).toBeNull();
    expect(saved.role).toBe("judge");
  });
});

// ── save (update) ─────────────────────────────────────────────────────────────

describe("save (update)", () => {
  it("updates memberNumber and role when saved again via with()", async () => {
    const userCarol = await userRepo.save(ctx, UserEntity.create({ name: "Carol", email: "carol@club.com" }));
    const entity = MemberEntity.create({
      userId: userCarol.id,
      organizationId: orgId,
      memberNumber: "010",
      role: "member",
      user: { id: userCarol.id, name: userCarol.name, email: userCarol.email },
    });
    const saved = await memberRepo.save(ctx, entity);

    const updated = await memberRepo.save(ctx, saved.with({ memberNumber: "099", role: "admin" }));

    expect(updated.id).toBe(saved.id);
    expect(updated.memberNumber).toBe("099");
    expect(updated.role).toBe("admin");
    expect(updated.user.name).toBe("Carol");
  });

  it("can clear memberNumber to null via with()", async () => {
    const userDave = await userRepo.save(ctx, UserEntity.create({ name: "Dave", email: "dave@club.com" }));
    const entity = MemberEntity.create({
      userId: userDave.id,
      organizationId: orgId,
      memberNumber: "050",
      role: "member",
      user: { id: userDave.id, name: userDave.name, email: userDave.email },
    });
    const saved = await memberRepo.save(ctx, entity);

    const updated = await memberRepo.save(ctx, saved.with({ memberNumber: null }));

    expect(updated.memberNumber).toBeNull();
  });
});

// ── findById ──────────────────────────────────────────────────────────────────

describe("findById", () => {
  it("returns null for a non-existent id", async () => {
    const result = await memberRepo.findById(ctx, "00000000-0000-0000-0000-000000000000");
    expect(result).toBeNull();
  });

  it("returns the member with user data joined", async () => {
    const userEve = await userRepo.save(ctx, UserEntity.create({ name: "Eve", email: "eve@club.com" }));
    const entity = MemberEntity.create({
      userId: userEve.id,
      organizationId: orgId,
      memberNumber: "007",
      role: "member",
      user: { id: userEve.id, name: userEve.name, email: userEve.email },
    });
    const saved = await memberRepo.save(ctx, entity);

    const found = await memberRepo.findById(ctx, saved.id);

    expect(found).not.toBeNull();
    expect(found!.id).toBe(saved.id);
    expect(found!.user.name).toBe("Eve");
    expect(found!.user.email).toBe("eve@club.com");
  });
});

// ── findByUserAndOrg ──────────────────────────────────────────────────────────

describe("findByUserAndOrg", () => {
  it("returns null when the user is not a member of the org", async () => {
    const userFrank = await userRepo.save(ctx, UserEntity.create({ name: "Frank", email: "frank@club.com" }));

    const result = await memberRepo.findByUserAndOrg(ctx, userFrank.id, orgId);
    expect(result).toBeNull();
  });

  it("returns the member when the user belongs to the org", async () => {
    const userGrace = await userRepo.save(ctx, UserEntity.create({ name: "Grace", email: "grace@club.com" }));
    const entity = MemberEntity.create({
      userId: userGrace.id,
      organizationId: orgId,
      memberNumber: null,
      role: "member",
      user: { id: userGrace.id, name: userGrace.name, email: userGrace.email },
    });
    await memberRepo.save(ctx, entity);

    const found = await memberRepo.findByUserAndOrg(ctx, userGrace.id, orgId);

    expect(found).not.toBeNull();
    expect(found!.userId).toBe(userGrace.id);
  });

  it("does not return a member from a different org", async () => {
    const userHank = await userRepo.save(ctx, UserEntity.create({ name: "Hank", email: "hank@club.com" }));
    const entity = MemberEntity.create({
      userId: userHank.id,
      organizationId: orgId,
      memberNumber: null,
      role: "member",
      user: { id: userHank.id, name: userHank.name, email: userHank.email },
    });
    await memberRepo.save(ctx, entity);

    const result = await memberRepo.findByUserAndOrg(ctx, userHank.id, otherOrgId);
    expect(result).toBeNull();
  });
});

// ── listByOrganization ────────────────────────────────────────────────────────

describe("listByOrganization", () => {
  it("returns an empty array when the org has no members", async () => {
    const [emptyOrg] = await testDb.db
      .insert(organization)
      .values({ name: "Empty Club", slug: "empty-club", createdAt: new Date() })
      .returning();

    const result = await memberRepo.listByOrganization(ctx, emptyOrg.id);
    expect(result).toEqual([]);
  });

  it("returns all members for the org with user data", async () => {
    const [listOrg] = await testDb.db
      .insert(organization)
      .values({ name: "List Club", slug: "list-club", createdAt: new Date() })
      .returning();

    const userIvy = await userRepo.save(ctx, UserEntity.create({ name: "Ivy", email: "ivy@list.com" }));
    const userJack = await userRepo.save(ctx, UserEntity.create({ name: "Jack", email: "jack@list.com" }));

    await memberRepo.save(ctx, MemberEntity.create({
      userId: userIvy.id, organizationId: listOrg.id, memberNumber: "1", role: "admin",
      user: { id: userIvy.id, name: userIvy.name, email: userIvy.email },
    }));
    await memberRepo.save(ctx, MemberEntity.create({
      userId: userJack.id, organizationId: listOrg.id, memberNumber: "2", role: "member",
      user: { id: userJack.id, name: userJack.name, email: userJack.email },
    }));

    const list = await memberRepo.listByOrganization(ctx, listOrg.id);

    expect(list).toHaveLength(2);
    expect(list.map((m) => m.user.name).sort()).toEqual(["Ivy", "Jack"]);
  });

  it("does not include members from other orgs", async () => {
    const [orgA, orgB] = await testDb.db
      .insert(organization)
      .values([
        { name: "Club A", slug: "club-a", createdAt: new Date() },
        { name: "Club B", slug: "club-b", createdAt: new Date() },
      ])
      .returning();

    const userKate = await userRepo.save(ctx, UserEntity.create({ name: "Kate", email: "kate@a.com" }));
    const userLeo = await userRepo.save(ctx, UserEntity.create({ name: "Leo", email: "leo@b.com" }));

    await memberRepo.save(ctx, MemberEntity.create({
      userId: userKate.id, organizationId: orgA.id, memberNumber: null, role: "member",
      user: { id: userKate.id, name: userKate.name, email: userKate.email },
    }));
    await memberRepo.save(ctx, MemberEntity.create({
      userId: userLeo.id, organizationId: orgB.id, memberNumber: null, role: "member",
      user: { id: userLeo.id, name: userLeo.name, email: userLeo.email },
    }));

    const listA = await memberRepo.listByOrganization(ctx, orgA.id);
    expect(listA).toHaveLength(1);
    expect(listA[0].user.name).toBe("Kate");
  });
});

// ── delete ────────────────────────────────────────────────────────────────────

describe("delete", () => {
  it("removes the member so findById returns null", async () => {
    const userMia = await userRepo.save(ctx, UserEntity.create({ name: "Mia", email: "mia@club.com" }));
    const entity = MemberEntity.create({
      userId: userMia.id,
      organizationId: orgId,
      memberNumber: null,
      role: "member",
      user: { id: userMia.id, name: userMia.name, email: userMia.email },
    });
    const saved = await memberRepo.save(ctx, entity);

    await memberRepo.delete(ctx, saved);

    expect(await memberRepo.findById(ctx, saved.id)).toBeNull();
  });

  it("does not affect other members in the same org", async () => {
    const [deleteOrg] = await testDb.db
      .insert(organization)
      .values({ name: "Delete Test Club", slug: "delete-test-club", createdAt: new Date() })
      .returning();

    const userNed = await userRepo.save(ctx, UserEntity.create({ name: "Ned", email: "ned@del.com" }));
    const userOlga = await userRepo.save(ctx, UserEntity.create({ name: "Olga", email: "olga@del.com" }));

    const ned = await memberRepo.save(ctx, MemberEntity.create({
      userId: userNed.id, organizationId: deleteOrg.id, memberNumber: null, role: "member",
      user: { id: userNed.id, name: userNed.name, email: userNed.email },
    }));
    const olga = await memberRepo.save(ctx, MemberEntity.create({
      userId: userOlga.id, organizationId: deleteOrg.id, memberNumber: null, role: "member",
      user: { id: userOlga.id, name: userOlga.name, email: userOlga.email },
    }));

    await memberRepo.delete(ctx, ned);

    expect(await memberRepo.findById(ctx, ned.id)).toBeNull();
    expect(await memberRepo.findById(ctx, olga.id)).not.toBeNull();
  });
});
