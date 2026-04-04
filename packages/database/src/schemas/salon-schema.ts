import { relations, sql } from "drizzle-orm";
import {
  boolean,
  decimal,
  index,
  integer,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { member, organization, user } from "./auth-schema.ts";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const salonStatusEnum = pgEnum("salon_status", ["draft", "open", "judging", "complete"]);

export const slideshowRevealModeEnum = pgEnum("slideshow_reveal_mode", [
  "score_after", // show image first, then reveal score on advance
  "score_alongside", // show image and score at the same time
]);

export const submissionStatusEnum = pgEnum("submission_status", [
  "pending",
  "accepted",
  "withdrawn",
]);

export const submissionMediumEnum = pgEnum("submission_medium", [
  "digital",
  "print",
]);

// ─── Competition Classes ─────────────────────────────────────────────────────

/**
 * Optional per-org classification system (e.g. Novice, Intermediate, Advanced).
 * If an org defines no classes, the system is ignored.
 */
export const competitionClass = pgTable(
  "competition_class",
  {
    id: uuid("id")
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    displayOrder: smallint("display_order").default(0).notNull(),
    // When year-end points reach this threshold, auto-promote to next class (null = no auto-promote)
    autoPromoteThreshold: smallint("auto_promote_threshold"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("competition_class_orgId_idx").on(table.organizationId)],
);

// ─── Salon Template ───────────────────────────────────────────────────────────

/**
 * A reusable template per organization that seeds new salons.
 * Most config lives here and is copied into the salon at creation time.
 */
export const salonTemplate = pgTable("salon_template", {
  id: uuid("id")
    .default(sql`pg_catalog.gen_random_uuid()`)
    .primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  // Whether this salon accepts digital uploads or physical prints
  medium: submissionMediumEnum("medium").default("digital").notNull(),
  // Default max submissions a member can make across the whole salon
  maxSubmissionsPerMember: smallint("max_submissions_per_member").default(3).notNull(),
  slideshowRevealMode: slideshowRevealModeEnum("slideshow_reveal_mode")
    .default("score_after")
    .notNull(),
  // Minimum total score to show score/comment in the slideshow (null = show all)
  awardThreshold: decimal("award_threshold", { precision: 8, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

/**
 * Scoring criteria defined on the template.
 * All categories in a salon share the same criteria.
 */
export const templateScoringCriterion = pgTable(
  "template_scoring_criterion",
  {
    id: uuid("id")
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => salonTemplate.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    minScore: smallint("min_score").default(1).notNull(),
    maxScore: smallint("max_score").default(10).notNull(),
    // Weight as a percentage-style multiplier, e.g. 1.0 = equal weight, 2.0 = double weight
    weight: decimal("weight", { precision: 4, scale: 2 }).default("1.00").notNull(),
    displayOrder: smallint("display_order").default(0).notNull(),
  },
  (table) => [index("template_criterion_templateId_idx").on(table.templateId)],
);

/**
 * Named category slots on the template (e.g. "Nature", "Travel", "Stars").
 * These become salon categories when a salon is created.
 */
export const templateCategorySlot = pgTable(
  "template_category_slot",
  {
    id: uuid("id")
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    templateId: uuid("template_id")
      .notNull()
      .references(() => salonTemplate.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // Per-category override; null means inherit from salonTemplate.maxSubmissionsPerMember
    maxSubmissionsPerMember: smallint("max_submissions_per_member"),
    // Whether entries in this category get bonus points for year-end calculations
    hasBonusPoints: boolean("has_bonus_points").default(false).notNull(),
    bonusPoints: smallint("bonus_points").default(0).notNull(),
    // JSON array of competition_class IDs allowed to enter. Empty/null = all allowed.
    allowedClassIds: text("allowed_class_ids"),
    displayOrder: smallint("display_order").default(0).notNull(),
  },
  (table) => [index("template_slot_templateId_idx").on(table.templateId)],
);

// ─── Salon ────────────────────────────────────────────────────────────────────

/**
 * A monthly salon event created from a template.
 * Template values are copied in at creation so historical salons are unaffected
 * by future template changes.
 */
export const salon = pgTable(
  "salon",
  {
    id: uuid("id")
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    // Reference to the source template (nullable — template may be deleted later)
    templateId: uuid("template_id").references(() => salonTemplate.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    year: smallint("year").notNull(),
    month: smallint("month").notNull(), // 1–12
    status: salonStatusEnum("status").default("draft").notNull(),
    // The assigned judge for this salon
    judgeId: uuid("judge_id").references(() => user.id, { onDelete: "set null" }),
    // Copied from template, editable per-salon
    medium: submissionMediumEnum("medium").default("digital").notNull(),
    maxSubmissionsPerMember: smallint("max_submissions_per_member").default(3).notNull(),
    slideshowRevealMode: slideshowRevealModeEnum("slideshow_reveal_mode")
      .default("score_after")
      .notNull(),
    awardThreshold: decimal("award_threshold", { precision: 8, scale: 2 }),
    // When the slideshow should auto-start (null = manual trigger only)
    slideshowScheduledAt: timestamp("slideshow_scheduled_at"),
    // When the slideshow actually started
    slideshowStartedAt: timestamp("slideshow_started_at"),
    // When submissions close
    submissionsCloseAt: timestamp("submissions_close_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("salon_organizationId_idx").on(table.organizationId),
    index("salon_year_month_idx").on(table.year, table.month),
    index("salon_status_idx").on(table.status),
  ],
);

/**
 * Snapshot of scoring criteria at the time the salon was created.
 * Immutable after creation so historical scores remain meaningful.
 */
export const salonScoringCriterion = pgTable(
  "salon_scoring_criterion",
  {
    id: uuid("id")
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    salonId: uuid("salon_id")
      .notNull()
      .references(() => salon.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    minScore: smallint("min_score").notNull(),
    maxScore: smallint("max_score").notNull(),
    weight: decimal("weight", { precision: 4, scale: 2 }).notNull(),
    displayOrder: smallint("display_order").default(0).notNull(),
  },
  (table) => [index("salon_criterion_salonId_idx").on(table.salonId)],
);

/**
 * Categories within a salon (e.g. "Nature", "Travel").
 * Created from template slots; names are editable at salon-creation time.
 */
export const salonCategory = pgTable(
  "salon_category",
  {
    id: uuid("id")
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    salonId: uuid("salon_id")
      .notNull()
      .references(() => salon.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // null = inherit from salon.maxSubmissionsPerMember
    maxSubmissionsPerMember: smallint("max_submissions_per_member"),
    // Bonus points for year-end calculations (snapshotted from template slot)
    hasBonusPoints: boolean("has_bonus_points").default(false).notNull(),
    bonusPoints: smallint("bonus_points").default(0).notNull(),
    // JSON array of competition_class IDs allowed to enter. Empty/null = all allowed.
    allowedClassIds: text("allowed_class_ids"),
    displayOrder: smallint("display_order").default(0).notNull(),
  },
  (table) => [index("salon_category_salonId_idx").on(table.salonId)],
);

// ─── Submissions ──────────────────────────────────────────────────────────────

/**
 * A photo submitted by a member into a salon category.
 */
export const submission = pgTable(
  "submission",
  {
    id: uuid("id")
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    salonCategoryId: uuid("salon_category_id")
      .notNull()
      .references(() => salonCategory.id, { onDelete: "cascade" }),
    // The member record (links to both user and org)
    memberId: uuid("member_id")
      .notNull()
      .references(() => member.id, { onDelete: "cascade" }),
    // S3 storage key — nullable for print entries without a digital upload
    storageKey: text("storage_key"),
    originalFilename: text("original_filename"),
    // Image metadata — nullable for print-only entries
    fileSizeBytes: integer("file_size_bytes"),
    widthPx: integer("width_px"),
    heightPx: integer("height_px"),
    status: submissionStatusEnum("status").default("pending").notNull(),
    title: text("title"),
    submittedAt: timestamp("submitted_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("submission_salonCategoryId_idx").on(table.salonCategoryId),
    index("submission_memberId_idx").on(table.memberId),
  ],
);

// ─── Scoring ──────────────────────────────────────────────────────────────────

/**
 * The judge's overall assessment of a single submission.
 * One score record per submission.
 */
export const score = pgTable(
  "score",
  {
    id: uuid("id")
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    submissionId: uuid("submission_id")
      .notNull()
      .unique()
      .references(() => submission.id, { onDelete: "cascade" }),
    judgeId: uuid("judge_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    comment: text("comment"),
    // Weighted total across all criteria — stored for fast queries (annual best-of)
    totalScore: decimal("total_score", { precision: 8, scale: 2 }),
    // True once the judge has finished this submission
    isComplete: boolean("is_complete").default(false).notNull(),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("score_submissionId_idx").on(table.submissionId),
    index("score_judgeId_idx").on(table.judgeId),
  ],
);

/**
 * Individual criterion score values within a score.
 */
export const scoreCriterionValue = pgTable(
  "score_criterion_value",
  {
    id: uuid("id")
      .default(sql`pg_catalog.gen_random_uuid()`)
      .primaryKey(),
    scoreId: uuid("score_id")
      .notNull()
      .references(() => score.id, { onDelete: "cascade" }),
    // References the snapshotted criterion on the salon
    salonScoringCriterionId: uuid("salon_scoring_criterion_id")
      .notNull()
      .references(() => salonScoringCriterion.id, { onDelete: "cascade" }),
    value: decimal("value", { precision: 5, scale: 2 }).notNull(),
  },
  (table) => [index("score_criterion_scoreId_idx").on(table.scoreId)],
);

// ─── Relations ────────────────────────────────────────────────────────────────

export const competitionClassRelations = relations(competitionClass, ({ one }) => ({
  organization: one(organization, {
    fields: [competitionClass.organizationId],
    references: [organization.id],
  }),
}));

export const salonTemplateRelations = relations(salonTemplate, ({ one, many }) => ({
  organization: one(organization, {
    fields: [salonTemplate.organizationId],
    references: [organization.id],
  }),
  scoringCriteria: many(templateScoringCriterion),
  categorySlots: many(templateCategorySlot),
  salons: many(salon),
}));

export const templateScoringCriterionRelations = relations(templateScoringCriterion, ({ one }) => ({
  template: one(salonTemplate, {
    fields: [templateScoringCriterion.templateId],
    references: [salonTemplate.id],
  }),
}));

export const templateCategorySlotRelations = relations(templateCategorySlot, ({ one }) => ({
  template: one(salonTemplate, {
    fields: [templateCategorySlot.templateId],
    references: [salonTemplate.id],
  }),
}));

export const salonRelations = relations(salon, ({ one, many }) => ({
  organization: one(organization, {
    fields: [salon.organizationId],
    references: [organization.id],
  }),
  template: one(salonTemplate, {
    fields: [salon.templateId],
    references: [salonTemplate.id],
  }),
  judge: one(user, {
    fields: [salon.judgeId],
    references: [user.id],
  }),
  scoringCriteria: many(salonScoringCriterion),
  categories: many(salonCategory),
}));

export const salonScoringCriterionRelations = relations(salonScoringCriterion, ({ one, many }) => ({
  salon: one(salon, {
    fields: [salonScoringCriterion.salonId],
    references: [salon.id],
  }),
  criterionValues: many(scoreCriterionValue),
}));

export const salonCategoryRelations = relations(salonCategory, ({ one, many }) => ({
  salon: one(salon, {
    fields: [salonCategory.salonId],
    references: [salon.id],
  }),
  submissions: many(submission),
}));

export const submissionRelations = relations(submission, ({ one }) => ({
  salonCategory: one(salonCategory, {
    fields: [submission.salonCategoryId],
    references: [salonCategory.id],
  }),
  member: one(member, {
    fields: [submission.memberId],
    references: [member.id],
  }),
  score: one(score, {
    fields: [submission.id],
    references: [score.submissionId],
  }),
}));

export const scoreRelations = relations(score, ({ one, many }) => ({
  submission: one(submission, {
    fields: [score.submissionId],
    references: [submission.id],
  }),
  judge: one(user, {
    fields: [score.judgeId],
    references: [user.id],
  }),
  criterionValues: many(scoreCriterionValue),
}));

export const scoreCriterionValueRelations = relations(scoreCriterionValue, ({ one }) => ({
  score: one(score, {
    fields: [scoreCriterionValue.scoreId],
    references: [score.id],
  }),
  criterion: one(salonScoringCriterion, {
    fields: [scoreCriterionValue.salonScoringCriterionId],
    references: [salonScoringCriterion.id],
  }),
}));
