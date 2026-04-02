import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { organization, user } from "@photo-salon/database/schema";
import { createPgliteDb, type TestDatabase } from "@/test/pglite-db.ts";
import { SalonRepository } from "./salon-repository.ts";
import { SalonEntity } from "./salon-entity.ts";
import { SalonScoringCriterionEntity } from "./salon-scoring-criterion-entity.ts";
import { SalonCategoryEntity } from "./salon-category-entity.ts";

const ctx = {} as Parameters<SalonRepository["findById"]>[0];

let testDb: TestDatabase;
let repo: SalonRepository;
let orgId: string;
let judgeUserId: string;

beforeAll(async () => {
  testDb = await createPgliteDb();
  repo = new SalonRepository(testDb.db);

  const [org] = await testDb.db
    .insert(organization)
    .values({ name: "Photo Club", slug: "photo-club", createdAt: new Date() })
    .returning();
  orgId = org.id;

  const [judge] = await testDb.db
    .insert(user)
    .values({ name: "Judge", email: "judge@club.com", emailVerified: false, createdAt: new Date(), updatedAt: new Date() })
    .returning();
  judgeUserId = judge.id;
});

afterAll(async () => {
  await testDb.cleanup();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function createSalon(overrides?: Partial<Parameters<typeof SalonEntity.create>[0]>) {
  return SalonEntity.create({
    organizationId: orgId,
    templateId: null,
    name: "March 2026 Salon",
    year: 2026,
    month: 3,
    ...overrides,
  });
}

// ── save (create) ─────────────────────────────────────────────────────────────

describe("save (create)", () => {
  it("creates a new salon with defaults", async () => {
    const entity = createSalon();
    const saved = await repo.save(ctx, entity);

    expect(saved).toBeInstanceOf(SalonEntity);
    expect(saved.id).toBe(entity.id);
    expect(saved.name).toBe("March 2026 Salon");
    expect(saved.year).toBe(2026);
    expect(saved.month).toBe(3);
    expect(saved.status).toBe("draft");
    expect(saved.judgeId).toBeNull();
    expect(saved.maxSubmissionsPerMember).toBe(3);
    expect(saved.slideshowRevealMode).toBe("score_after");
    expect(saved.criteria).toHaveLength(0);
    expect(saved.categories).toHaveLength(0);
  });

  it("respects custom slideshowRevealMode and maxSubmissions", async () => {
    const entity = createSalon({
      name: "Custom Salon",
      maxSubmissionsPerMember: 5,
      slideshowRevealMode: "score_alongside",
    });
    const saved = await repo.save(ctx, entity);

    expect(saved.maxSubmissionsPerMember).toBe(5);
    expect(saved.slideshowRevealMode).toBe("score_alongside");
  });
});

// ── save (update) ─────────────────────────────────────────────────────────────

describe("save (update)", () => {
  it("updates salon fields via with()", async () => {
    const saved = await repo.save(ctx, createSalon({ name: "Old Name" }));

    const updated = await repo.save(ctx, saved.with({ name: "New Name", judgeId: judgeUserId }));

    expect(updated.id).toBe(saved.id);
    expect(updated.name).toBe("New Name");
    expect(updated.judgeId).toBe(judgeUserId);
  });

  it("persists status transitions", async () => {
    const saved = await repo.save(ctx, createSalon({ name: "Status Test" }));

    const opened = await repo.save(ctx, saved.transitionTo("open"));
    expect(opened.status).toBe("open");

    const judging = await repo.save(ctx, opened.transitionTo("judging"));
    expect(judging.status).toBe("judging");

    const complete = await repo.save(ctx, judging.transitionTo("complete"));
    expect(complete.status).toBe("complete");
  });

  it("preserves criteria and categories on update", async () => {
    const saved = await repo.save(ctx, createSalon({ name: "With Children" }));
    await repo.saveCriteria(ctx, [
      SalonScoringCriterionEntity.create({ salonId: saved.id, name: "Composition", minScore: 1, maxScore: 10, weight: "1.00", displayOrder: 0 }),
    ]);
    await repo.saveCategories(ctx, [
      SalonCategoryEntity.create({ salonId: saved.id, name: "Nature" }),
    ]);

    const updated = await repo.save(ctx, saved.with({ name: "Renamed" }));

    expect(updated.criteria).toHaveLength(1);
    expect(updated.categories).toHaveLength(1);
  });
});

// ── findById ──────────────────────────────────────────────────────────────────

describe("findById", () => {
  it("returns null for non-existent id", async () => {
    const result = await repo.findById(ctx, "00000000-0000-0000-0000-000000000000");
    expect(result).toBeNull();
  });

  it("returns the full aggregate with criteria and categories", async () => {
    const saved = await repo.save(ctx, createSalon({ name: "Find Me" }));
    await repo.saveCriteria(ctx, [
      SalonScoringCriterionEntity.create({ salonId: saved.id, name: "Light", minScore: 1, maxScore: 10, weight: "1.50", displayOrder: 0 }),
      SalonScoringCriterionEntity.create({ salonId: saved.id, name: "Focus", minScore: 1, maxScore: 10, weight: "1.00", displayOrder: 1 }),
    ]);
    await repo.saveCategories(ctx, [
      SalonCategoryEntity.create({ salonId: saved.id, name: "Travel", displayOrder: 0 }),
      SalonCategoryEntity.create({ salonId: saved.id, name: "Wildlife", displayOrder: 1 }),
    ]);

    const found = await repo.findById(ctx, saved.id);

    expect(found).not.toBeNull();
    expect(found!.criteria).toHaveLength(2);
    expect(found!.criteria.map((c) => c.name)).toEqual(["Light", "Focus"]);
    expect(found!.categories).toHaveLength(2);
    expect(found!.categories.map((c) => c.name)).toEqual(["Travel", "Wildlife"]);
  });
});

// ── listByOrganization ────────────────────────────────────────────────────────

describe("listByOrganization", () => {
  it("returns empty array for org with no salons", async () => {
    const [emptyOrg] = await testDb.db
      .insert(organization)
      .values({ name: "Empty Club", slug: "empty-club", createdAt: new Date() })
      .returning();

    const result = await repo.listByOrganization(ctx, emptyOrg.id);
    expect(result).toEqual([]);
  });

  it("returns all salons for the org with children, ordered by year/month", async () => {
    const [listOrg] = await testDb.db
      .insert(organization)
      .values({ name: "List Club", slug: "list-club", createdAt: new Date() })
      .returning();

    const s1 = await repo.save(ctx, SalonEntity.create({ organizationId: listOrg.id, templateId: null, name: "June", year: 2026, month: 6 }));
    const s2 = await repo.save(ctx, SalonEntity.create({ organizationId: listOrg.id, templateId: null, name: "March", year: 2026, month: 3 }));
    await repo.saveCriteria(ctx, [
      SalonScoringCriterionEntity.create({ salonId: s1.id, name: "Color", minScore: 1, maxScore: 5, weight: "1.00", displayOrder: 0 }),
    ]);
    await repo.saveCategories(ctx, [
      SalonCategoryEntity.create({ salonId: s2.id, name: "Macro" }),
    ]);

    const list = await repo.listByOrganization(ctx, listOrg.id);

    expect(list).toHaveLength(2);
    // Ordered by year, month ascending
    expect(list[0].name).toBe("March");
    expect(list[1].name).toBe("June");
    expect(list[1].criteria).toHaveLength(1);
    expect(list[0].categories).toHaveLength(1);
  });

  it("does not return salons from another org", async () => {
    const [orgA, orgB] = await testDb.db
      .insert(organization)
      .values([
        { name: "Club A", slug: "salon-club-a", createdAt: new Date() },
        { name: "Club B", slug: "salon-club-b", createdAt: new Date() },
      ])
      .returning();

    await repo.save(ctx, SalonEntity.create({ organizationId: orgA.id, templateId: null, name: "A Salon", year: 2026, month: 1 }));
    await repo.save(ctx, SalonEntity.create({ organizationId: orgB.id, templateId: null, name: "B Salon", year: 2026, month: 1 }));

    const list = await repo.listByOrganization(ctx, orgA.id);
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("A Salon");
  });
});

// ── delete ────────────────────────────────────────────────────────────────────

describe("delete", () => {
  it("removes the salon so findById returns null", async () => {
    const saved = await repo.save(ctx, createSalon({ name: "To Delete" }));
    await repo.delete(ctx, saved);
    expect(await repo.findById(ctx, saved.id)).toBeNull();
  });

  it("cascades to criteria and categories", async () => {
    const saved = await repo.save(ctx, createSalon({ name: "Cascade Test" }));
    await repo.saveCriteria(ctx, [
      SalonScoringCriterionEntity.create({ salonId: saved.id, name: "X", minScore: 1, maxScore: 5, weight: "1.00", displayOrder: 0 }),
    ]);
    await repo.saveCategories(ctx, [
      SalonCategoryEntity.create({ salonId: saved.id, name: "Y" }),
    ]);

    await repo.delete(ctx, saved);
    expect(await repo.findById(ctx, saved.id)).toBeNull();
  });
});

// ── saveCriteria (batch) ──────────────────────────────────────────────────────

describe("saveCriteria", () => {
  it("batch-inserts multiple criteria in one call", async () => {
    const saved = await repo.save(ctx, createSalon({ name: "Batch Criteria" }));
    await repo.saveCriteria(ctx, [
      SalonScoringCriterionEntity.create({ salonId: saved.id, name: "A", minScore: 0, maxScore: 5, weight: "1.00", displayOrder: 0 }),
      SalonScoringCriterionEntity.create({ salonId: saved.id, name: "B", minScore: 0, maxScore: 5, weight: "2.00", displayOrder: 1 }),
      SalonScoringCriterionEntity.create({ salonId: saved.id, name: "C", minScore: 0, maxScore: 5, weight: "0.50", displayOrder: 2 }),
    ]);

    const reloaded = await repo.findById(ctx, saved.id);
    expect(reloaded!.criteria).toHaveLength(3);
    expect(reloaded!.criteria.map((c) => c.name)).toEqual(["A", "B", "C"]);
    expect(reloaded!.criteria[1].weight).toBe("2.00");
  });

  it("does nothing when given an empty array", async () => {
    const saved = await repo.save(ctx, createSalon({ name: "Empty Criteria" }));
    await repo.saveCriteria(ctx, []);
    const reloaded = await repo.findById(ctx, saved.id);
    expect(reloaded!.criteria).toHaveLength(0);
  });
});

// ── saveCategory / saveCategories ─────────────────────────────────────────────

describe("saveCategory", () => {
  it("creates a single category and returns the entity", async () => {
    const saved = await repo.save(ctx, createSalon({ name: "Single Cat" }));
    const cat = SalonCategoryEntity.create({ salonId: saved.id, name: "Portraits" });

    const result = await repo.saveCategory(ctx, cat);

    expect(result).toBeInstanceOf(SalonCategoryEntity);
    expect(result.id).toBe(cat.id);
    expect(result.name).toBe("Portraits");
  });

  it("updates an existing category via upsert", async () => {
    const saved = await repo.save(ctx, createSalon({ name: "Upsert Cat" }));
    const cat = await repo.saveCategory(ctx, SalonCategoryEntity.create({ salonId: saved.id, name: "Old" }));

    const updated = await repo.saveCategory(ctx, cat.with({ name: "New" }));

    expect(updated.id).toBe(cat.id);
    expect(updated.name).toBe("New");
  });
});

describe("saveCategories", () => {
  it("batch-inserts multiple categories", async () => {
    const saved = await repo.save(ctx, createSalon({ name: "Batch Cats" }));
    await repo.saveCategories(ctx, [
      SalonCategoryEntity.create({ salonId: saved.id, name: "Nature", displayOrder: 0 }),
      SalonCategoryEntity.create({ salonId: saved.id, name: "Street", displayOrder: 1 }),
    ]);

    const reloaded = await repo.findById(ctx, saved.id);
    expect(reloaded!.categories).toHaveLength(2);
    expect(reloaded!.categories.map((c) => c.name)).toEqual(["Nature", "Street"]);
  });
});

// ── deleteCategory ────────────────────────────────────────────────────────────

describe("deleteCategory", () => {
  it("removes the category from the salon aggregate", async () => {
    const saved = await repo.save(ctx, createSalon({ name: "Delete Cat" }));
    const keep = await repo.saveCategory(ctx, SalonCategoryEntity.create({ salonId: saved.id, name: "Keep" }));
    const remove = await repo.saveCategory(ctx, SalonCategoryEntity.create({ salonId: saved.id, name: "Remove" }));

    await repo.deleteCategory(ctx, remove);

    const reloaded = await repo.findById(ctx, saved.id);
    expect(reloaded!.categories).toHaveLength(1);
    expect(reloaded!.categories[0].id).toBe(keep.id);
  });
});

// ── displayOrder sorting ──────────────────────────────────────────────────────

describe("displayOrder sorting", () => {
  it("returns criteria sorted by displayOrder", async () => {
    const saved = await repo.save(ctx, createSalon({ name: "Criteria Order" }));
    await repo.saveCriteria(ctx, [
      SalonScoringCriterionEntity.create({ salonId: saved.id, name: "C", minScore: 1, maxScore: 5, weight: "1.00", displayOrder: 2 }),
      SalonScoringCriterionEntity.create({ salonId: saved.id, name: "A", minScore: 1, maxScore: 5, weight: "1.00", displayOrder: 0 }),
      SalonScoringCriterionEntity.create({ salonId: saved.id, name: "B", minScore: 1, maxScore: 5, weight: "1.00", displayOrder: 1 }),
    ]);

    const reloaded = await repo.findById(ctx, saved.id);
    expect(reloaded!.criteria.map((c) => c.name)).toEqual(["A", "B", "C"]);
  });

  it("returns categories sorted by displayOrder", async () => {
    const saved = await repo.save(ctx, createSalon({ name: "Category Order" }));
    await repo.saveCategories(ctx, [
      SalonCategoryEntity.create({ salonId: saved.id, name: "Z", displayOrder: 2 }),
      SalonCategoryEntity.create({ salonId: saved.id, name: "X", displayOrder: 0 }),
      SalonCategoryEntity.create({ salonId: saved.id, name: "Y", displayOrder: 1 }),
    ]);

    const reloaded = await repo.findById(ctx, saved.id);
    expect(reloaded!.categories.map((c) => c.name)).toEqual(["X", "Y", "Z"]);
  });
});

// ── SalonEntity status machine ────────────────────────────────────────────────

describe("SalonEntity status transitions", () => {
  it("allows forward: draft → open → judging → complete", () => {
    const entity = createSalon();
    expect(entity.status).toBe("draft");
    expect(entity.canTransitionTo("open")).toBe(true);

    const open = entity.transitionTo("open");
    expect(open.status).toBe("open");
    expect(open.canTransitionTo("judging")).toBe(true);

    const judging = open.transitionTo("judging");
    expect(judging.status).toBe("judging");
    expect(judging.canTransitionTo("complete")).toBe(true);

    const complete = judging.transitionTo("complete");
    expect(complete.status).toBe("complete");
  });

  it("allows backward: open → draft, judging → open, complete → judging", () => {
    const open = createSalon().transitionTo("open");
    expect(open.canTransitionTo("draft")).toBe(true);
    expect(open.transitionTo("draft").status).toBe("draft");

    const judging = open.transitionTo("judging");
    expect(judging.canTransitionTo("open")).toBe(true);
    expect(judging.transitionTo("open").status).toBe("open");

    const complete = judging.transitionTo("complete");
    expect(complete.canTransitionTo("judging")).toBe(true);
    expect(complete.transitionTo("judging").status).toBe("judging");
  });

  it("rejects skipping statuses", () => {
    const entity = createSalon();
    expect(entity.canTransitionTo("judging")).toBe(false);
    expect(entity.canTransitionTo("complete")).toBe(false);
    expect(() => entity.transitionTo("judging")).toThrow("Cannot transition");
  });

  it("rejects jumping more than one step back", () => {
    const judging = createSalon().transitionTo("open").transitionTo("judging");
    expect(judging.canTransitionTo("draft")).toBe(false);
    expect(() => judging.transitionTo("draft")).toThrow("Cannot transition");

    const complete = judging.transitionTo("complete");
    expect(complete.canTransitionTo("open")).toBe(false);
    expect(complete.canTransitionTo("draft")).toBe(false);
  });
});
