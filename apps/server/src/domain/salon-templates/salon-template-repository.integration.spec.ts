import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { organization } from "@photo-salon/database/schema";
import { createPgliteDb, type TestDatabase } from "@/test/pglite-db.ts";
import { SalonTemplateRepository } from "./salon-template-repository.ts";
import { SalonTemplateEntity } from "./salon-template-entity.ts";
import { TemplateScoringCriterionEntity } from "./template-scoring-criterion-entity.ts";
import { TemplateCategorySlotEntity } from "./template-category-slot-entity.ts";

const ctx = {} as Parameters<SalonTemplateRepository["findById"]>[0];

let testDb: TestDatabase;
let repo: SalonTemplateRepository;
let orgId: string;

beforeAll(async () => {
  testDb = await createPgliteDb();
  repo = new SalonTemplateRepository(testDb.db);

  const [org] = await testDb.db
    .insert(organization)
    .values({ name: "Test Club", slug: "test-club", createdAt: new Date() })
    .returning();
  orgId = org.id;
});

afterAll(async () => {
  await testDb.cleanup();
});

// ── Template save ─────────────────────────────────────────────────────────────

describe("save (template)", () => {
  it("creates a new template when the id is not in the database", async () => {
    const entity = SalonTemplateEntity.create({ organizationId: orgId, name: "Monthly Salon" });
    const saved = await repo.save(ctx, entity);

    expect(saved).toBeInstanceOf(SalonTemplateEntity);
    expect(saved.id).toBe(entity.id);
    expect(saved.name).toBe("Monthly Salon");
    expect(saved.maxSubmissionsPerMember).toBe(3);
    expect(saved.slideshowRevealMode).toBe("score_after");
    expect(saved.criteria).toHaveLength(0);
    expect(saved.slots).toHaveLength(0);
  });

  it("updates an existing template when saved again", async () => {
    const entity = SalonTemplateEntity.create({ organizationId: orgId, name: "Old Name" });
    await repo.save(ctx, entity);

    const updated = entity.with({ name: "New Name", maxSubmissionsPerMember: 5 });
    const saved = await repo.save(ctx, updated);

    expect(saved.id).toBe(entity.id);
    expect(saved.name).toBe("New Name");
    expect(saved.maxSubmissionsPerMember).toBe(5);
  });

  it("preserves existing criteria and slots when updating", async () => {
    const entity = SalonTemplateEntity.create({ organizationId: orgId, name: "With Children" });
    const saved = await repo.save(ctx, entity);
    await repo.saveCriterion(ctx, TemplateScoringCriterionEntity.create({ templateId: saved.id, name: "Sharpness" }));
    await repo.saveSlot(ctx, TemplateCategorySlotEntity.create({ templateId: saved.id, name: "Abstract" }));

    const updated = await repo.save(ctx, saved.with({ name: "Renamed" }));

    expect(updated.criteria).toHaveLength(1);
    expect(updated.slots).toHaveLength(1);
  });

  it("respects provided slideshowRevealMode", async () => {
    const entity = SalonTemplateEntity.create({
      organizationId: orgId,
      name: "Reveal Mode Test",
      slideshowRevealMode: "score_alongside",
    });
    const saved = await repo.save(ctx, entity);

    expect(saved.slideshowRevealMode).toBe("score_alongside");
  });
});

// ── Template findById ─────────────────────────────────────────────────────────

describe("findById", () => {
  it("returns null for a non-existent id", async () => {
    const result = await repo.findById(ctx, "00000000-0000-0000-0000-000000000000");
    expect(result).toBeNull();
  });

  it("returns the template with its criteria and slots", async () => {
    const entity = SalonTemplateEntity.create({ organizationId: orgId, name: "Find Me" });
    const saved = await repo.save(ctx, entity);
    await repo.saveCriterion(ctx, TemplateScoringCriterionEntity.create({ templateId: saved.id, name: "Composition" }));
    await repo.saveSlot(ctx, TemplateCategorySlotEntity.create({ templateId: saved.id, name: "Nature" }));

    const found = await repo.findById(ctx, saved.id);

    expect(found).not.toBeNull();
    expect(found!.name).toBe("Find Me");
    expect(found!.criteria).toHaveLength(1);
    expect(found!.criteria[0].name).toBe("Composition");
    expect(found!.slots).toHaveLength(1);
    expect(found!.slots[0].name).toBe("Nature");
  });
});

// ── Template listByOrganization ───────────────────────────────────────────────

describe("listByOrganization", () => {
  it("returns an empty array when the org has no templates", async () => {
    const [emptyOrg] = await testDb.db
      .insert(organization)
      .values({ name: "Empty Club", slug: "empty-club", createdAt: new Date() })
      .returning();

    const result = await repo.listByOrganization(ctx, emptyOrg.id);
    expect(result).toEqual([]);
  });

  it("returns all templates for the org with their children", async () => {
    const [org2] = await testDb.db
      .insert(organization)
      .values({ name: "Photo Club 2", slug: "photo-club-2", createdAt: new Date() })
      .returning();

    const t1 = await repo.save(ctx, SalonTemplateEntity.create({ organizationId: org2.id, name: "Template A" }));
    const t2 = await repo.save(ctx, SalonTemplateEntity.create({ organizationId: org2.id, name: "Template B" }));
    await repo.saveCriterion(ctx, TemplateScoringCriterionEntity.create({ templateId: t1.id, name: "Light" }));
    await repo.saveSlot(ctx, TemplateCategorySlotEntity.create({ templateId: t2.id, name: "Travel" }));

    const list = await repo.listByOrganization(ctx, org2.id);

    expect(list).toHaveLength(2);
    const a = list.find((t) => t.name === "Template A")!;
    const b = list.find((t) => t.name === "Template B")!;
    expect(a.criteria).toHaveLength(1);
    expect(b.slots).toHaveLength(1);
  });

  it("does not return templates belonging to another org", async () => {
    const [org3] = await testDb.db
      .insert(organization)
      .values({ name: "Other Club", slug: "other-club", createdAt: new Date() })
      .returning();
    const [myOrg] = await testDb.db
      .insert(organization)
      .values({ name: "My Club", slug: "my-club", createdAt: new Date() })
      .returning();

    await repo.save(ctx, SalonTemplateEntity.create({ organizationId: org3.id, name: "Their Template" }));
    await repo.save(ctx, SalonTemplateEntity.create({ organizationId: myOrg.id, name: "My Template" }));

    const result = await repo.listByOrganization(ctx, myOrg.id);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("My Template");
  });
});

// ── Template delete ───────────────────────────────────────────────────────────

describe("delete (template)", () => {
  it("removes the template so findById returns null", async () => {
    const entity = SalonTemplateEntity.create({ organizationId: orgId, name: "To Delete" });
    const saved = await repo.save(ctx, entity);

    await repo.delete(ctx, saved);

    expect(await repo.findById(ctx, saved.id)).toBeNull();
  });

  it("cascades to criteria and slots", async () => {
    const entity = SalonTemplateEntity.create({ organizationId: orgId, name: "Parent" });
    const saved = await repo.save(ctx, entity);
    await repo.saveCriterion(ctx, TemplateScoringCriterionEntity.create({ templateId: saved.id, name: "Exposure" }));
    await repo.saveSlot(ctx, TemplateCategorySlotEntity.create({ templateId: saved.id, name: "People" }));

    await repo.delete(ctx, saved);

    expect(await repo.findById(ctx, saved.id)).toBeNull();
  });
});

// ── Criterion save ────────────────────────────────────────────────────────────

describe("saveCriterion", () => {
  it("creates a new criterion from a created entity", async () => {
    const template = await repo.save(ctx, SalonTemplateEntity.create({ organizationId: orgId, name: "Criterion Test" }));
    const criterion = TemplateScoringCriterionEntity.create({ templateId: template.id, name: "Creativity" });

    const saved = await repo.saveCriterion(ctx, criterion);

    expect(saved).toBeInstanceOf(TemplateScoringCriterionEntity);
    expect(saved.id).toBe(criterion.id);
    expect(saved.name).toBe("Creativity");
    expect(saved.minScore).toBe(1);
    expect(saved.maxScore).toBe(10);
    expect(saved.weight).toBe("1.00");
    expect(saved.templateId).toBe(template.id);
  });

  it("updates an existing criterion when saved again", async () => {
    const template = await repo.save(ctx, SalonTemplateEntity.create({ organizationId: orgId, name: "Update Criterion" }));
    const criterion = await repo.saveCriterion(
      ctx,
      TemplateScoringCriterionEntity.create({ templateId: template.id, name: "Original" }),
    );

    const updated = await repo.saveCriterion(ctx, criterion.with({ name: "Revised", maxScore: 7, weight: "1.50" }));

    expect(updated.id).toBe(criterion.id);
    expect(updated.name).toBe("Revised");
    expect(updated.maxScore).toBe(7);
    expect(updated.weight).toBe("1.50");
  });

  it("stores provided min/max/weight/order", async () => {
    const template = await repo.save(ctx, SalonTemplateEntity.create({ organizationId: orgId, name: "Custom Criterion" }));
    const criterion = TemplateScoringCriterionEntity.create({
      templateId: template.id,
      name: "Technical",
      minScore: 0,
      maxScore: 5,
      weight: "2.00",
      displayOrder: 1,
    });

    const saved = await repo.saveCriterion(ctx, criterion);

    expect(saved.minScore).toBe(0);
    expect(saved.maxScore).toBe(5);
    expect(saved.weight).toBe("2.00");
    expect(saved.displayOrder).toBe(1);
  });

  it("appears in the template aggregate after saving", async () => {
    const template = await repo.save(ctx, SalonTemplateEntity.create({ organizationId: orgId, name: "Aggregate Check" }));
    await repo.saveCriterion(ctx, TemplateScoringCriterionEntity.create({ templateId: template.id, name: "Impact" }));

    const reloaded = await repo.findById(ctx, template.id);
    expect(reloaded!.criteria).toHaveLength(1);
    expect(reloaded!.criteria[0].name).toBe("Impact");
  });
});

// ── Criterion deleteCriterion ─────────────────────────────────────────────────

describe("deleteCriterion", () => {
  it("removes the criterion from the template aggregate", async () => {
    const template = await repo.save(ctx, SalonTemplateEntity.create({ organizationId: orgId, name: "Remove Criterion" }));
    const c1 = await repo.saveCriterion(ctx, TemplateScoringCriterionEntity.create({ templateId: template.id, name: "Keep" }));
    const c2 = await repo.saveCriterion(ctx, TemplateScoringCriterionEntity.create({ templateId: template.id, name: "Remove" }));

    await repo.deleteCriterion(ctx, c2);

    const reloaded = await repo.findById(ctx, template.id);
    expect(reloaded!.criteria).toHaveLength(1);
    expect(reloaded!.criteria[0].id).toBe(c1.id);
  });
});

// ── Slot save ─────────────────────────────────────────────────────────────────

describe("saveSlot", () => {
  it("creates a new slot from a created entity", async () => {
    const template = await repo.save(ctx, SalonTemplateEntity.create({ organizationId: orgId, name: "Slot Test" }));
    const slot = TemplateCategorySlotEntity.create({ templateId: template.id, name: "Macro" });

    const saved = await repo.saveSlot(ctx, slot);

    expect(saved).toBeInstanceOf(TemplateCategorySlotEntity);
    expect(saved.id).toBe(slot.id);
    expect(saved.name).toBe("Macro");
    expect(saved.maxSubmissionsPerMember).toBeNull();
    expect(saved.displayOrder).toBe(0);
    expect(saved.templateId).toBe(template.id);
  });

  it("updates an existing slot when saved again", async () => {
    const template = await repo.save(ctx, SalonTemplateEntity.create({ organizationId: orgId, name: "Update Slot" }));
    const slot = await repo.saveSlot(ctx, TemplateCategorySlotEntity.create({ templateId: template.id, name: "Old Name" }));

    const updated = await repo.saveSlot(ctx, slot.with({ name: "New Name", maxSubmissionsPerMember: 3 }));

    expect(updated.id).toBe(slot.id);
    expect(updated.name).toBe("New Name");
    expect(updated.maxSubmissionsPerMember).toBe(3);
  });

  it("can clear a maxSubmissionsPerMember override by setting null", async () => {
    const template = await repo.save(ctx, SalonTemplateEntity.create({ organizationId: orgId, name: "Clear Override" }));
    const slot = await repo.saveSlot(ctx, TemplateCategorySlotEntity.create({ templateId: template.id, name: "Stars", maxSubmissionsPerMember: 1 }));

    const updated = await repo.saveSlot(ctx, slot.with({ maxSubmissionsPerMember: null }));

    expect(updated.maxSubmissionsPerMember).toBeNull();
  });

  it("appears in the template aggregate after saving", async () => {
    const template = await repo.save(ctx, SalonTemplateEntity.create({ organizationId: orgId, name: "Slot Aggregate" }));
    await repo.saveSlot(ctx, TemplateCategorySlotEntity.create({ templateId: template.id, name: "Architecture" }));

    const reloaded = await repo.findById(ctx, template.id);
    expect(reloaded!.slots).toHaveLength(1);
    expect(reloaded!.slots[0].name).toBe("Architecture");
  });
});

// ── Slot deleteSlot ───────────────────────────────────────────────────────────

describe("deleteSlot", () => {
  it("removes the slot from the template aggregate", async () => {
    const template = await repo.save(ctx, SalonTemplateEntity.create({ organizationId: orgId, name: "Remove Slot" }));
    const s1 = await repo.saveSlot(ctx, TemplateCategorySlotEntity.create({ templateId: template.id, name: "Keep" }));
    const s2 = await repo.saveSlot(ctx, TemplateCategorySlotEntity.create({ templateId: template.id, name: "Remove" }));

    await repo.deleteSlot(ctx, s2);

    const reloaded = await repo.findById(ctx, template.id);
    expect(reloaded!.slots).toHaveLength(1);
    expect(reloaded!.slots[0].id).toBe(s1.id);
  });
});

// ── displayOrder sorting ──────────────────────────────────────────────────────

describe("displayOrder sorting", () => {
  it("returns criteria sorted by displayOrder ascending", async () => {
    const template = await repo.save(ctx, SalonTemplateEntity.create({ organizationId: orgId, name: "Order Test" }));
    await repo.saveCriterion(ctx, TemplateScoringCriterionEntity.create({ templateId: template.id, name: "C", displayOrder: 2 }));
    await repo.saveCriterion(ctx, TemplateScoringCriterionEntity.create({ templateId: template.id, name: "A", displayOrder: 0 }));
    await repo.saveCriterion(ctx, TemplateScoringCriterionEntity.create({ templateId: template.id, name: "B", displayOrder: 1 }));

    const reloaded = await repo.findById(ctx, template.id);
    expect(reloaded!.criteria.map((c) => c.name)).toEqual(["A", "B", "C"]);
  });

  it("returns slots sorted by displayOrder ascending", async () => {
    const template = await repo.save(ctx, SalonTemplateEntity.create({ organizationId: orgId, name: "Slot Order Test" }));
    await repo.saveSlot(ctx, TemplateCategorySlotEntity.create({ templateId: template.id, name: "Z", displayOrder: 3 }));
    await repo.saveSlot(ctx, TemplateCategorySlotEntity.create({ templateId: template.id, name: "X", displayOrder: 1 }));
    await repo.saveSlot(ctx, TemplateCategorySlotEntity.create({ templateId: template.id, name: "Y", displayOrder: 2 }));

    const reloaded = await repo.findById(ctx, template.id);
    expect(reloaded!.slots.map((s) => s.name)).toEqual(["X", "Y", "Z"]);
  });
});
