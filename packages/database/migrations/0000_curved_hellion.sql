CREATE TYPE "public"."salon_status" AS ENUM('draft', 'open', 'judging', 'complete');--> statement-breakpoint
CREATE TYPE "public"."slideshow_reveal_mode" AS ENUM('score_after', 'score_alongside');--> statement-breakpoint
CREATE TYPE "public"."submission_status" AS ENUM('pending', 'accepted', 'withdrawn');--> statement-breakpoint
CREATE TABLE "account" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"inviter_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"member_number" text,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo" text,
	"created_at" timestamp NOT NULL,
	"metadata" text,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" uuid NOT NULL,
	"active_organization_id" text,
	"impersonated_by" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"role" text,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "salon" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"template_id" uuid,
	"name" text NOT NULL,
	"year" smallint NOT NULL,
	"month" smallint NOT NULL,
	"status" "salon_status" DEFAULT 'draft' NOT NULL,
	"judge_id" uuid,
	"max_submissions_per_member" smallint DEFAULT 3 NOT NULL,
	"slideshow_reveal_mode" "slideshow_reveal_mode" DEFAULT 'score_after' NOT NULL,
	"slideshow_scheduled_at" timestamp,
	"slideshow_started_at" timestamp,
	"submissions_close_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "salon_category" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"salon_id" uuid NOT NULL,
	"name" text NOT NULL,
	"max_submissions_per_member" smallint,
	"display_order" smallint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "salon_scoring_criterion" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"salon_id" uuid NOT NULL,
	"name" text NOT NULL,
	"min_score" smallint NOT NULL,
	"max_score" smallint NOT NULL,
	"weight" numeric(4, 2) NOT NULL,
	"display_order" smallint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "salon_template" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"max_submissions_per_member" smallint DEFAULT 3 NOT NULL,
	"slideshow_reveal_mode" "slideshow_reveal_mode" DEFAULT 'score_after' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "score" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"judge_id" uuid NOT NULL,
	"comment" text,
	"total_score" numeric(8, 2),
	"is_complete" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "score_submission_id_unique" UNIQUE("submission_id")
);
--> statement-breakpoint
CREATE TABLE "score_criterion_value" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"score_id" uuid NOT NULL,
	"salon_scoring_criterion_id" uuid NOT NULL,
	"value" numeric(5, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submission" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"salon_category_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"original_filename" text NOT NULL,
	"file_size_bytes" integer NOT NULL,
	"width_px" integer NOT NULL,
	"height_px" integer NOT NULL,
	"status" "submission_status" DEFAULT 'pending' NOT NULL,
	"title" text,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "template_category_slot" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"name" text NOT NULL,
	"max_submissions_per_member" smallint,
	"display_order" smallint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "template_scoring_criterion" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"name" text NOT NULL,
	"min_score" smallint DEFAULT 1 NOT NULL,
	"max_score" smallint DEFAULT 10 NOT NULL,
	"weight" numeric(4, 2) DEFAULT '1.00' NOT NULL,
	"display_order" smallint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salon" ADD CONSTRAINT "salon_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salon" ADD CONSTRAINT "salon_template_id_salon_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."salon_template"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salon" ADD CONSTRAINT "salon_judge_id_user_id_fk" FOREIGN KEY ("judge_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salon_category" ADD CONSTRAINT "salon_category_salon_id_salon_id_fk" FOREIGN KEY ("salon_id") REFERENCES "public"."salon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salon_scoring_criterion" ADD CONSTRAINT "salon_scoring_criterion_salon_id_salon_id_fk" FOREIGN KEY ("salon_id") REFERENCES "public"."salon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salon_template" ADD CONSTRAINT "salon_template_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score" ADD CONSTRAINT "score_submission_id_submission_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submission"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score" ADD CONSTRAINT "score_judge_id_user_id_fk" FOREIGN KEY ("judge_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_criterion_value" ADD CONSTRAINT "score_criterion_value_score_id_score_id_fk" FOREIGN KEY ("score_id") REFERENCES "public"."score"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "score_criterion_value" ADD CONSTRAINT "score_criterion_value_salon_scoring_criterion_id_salon_scoring_criterion_id_fk" FOREIGN KEY ("salon_scoring_criterion_id") REFERENCES "public"."salon_scoring_criterion"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission" ADD CONSTRAINT "submission_salon_category_id_salon_category_id_fk" FOREIGN KEY ("salon_category_id") REFERENCES "public"."salon_category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission" ADD CONSTRAINT "submission_member_id_member_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."member"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_category_slot" ADD CONSTRAINT "template_category_slot_template_id_salon_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."salon_template"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_scoring_criterion" ADD CONSTRAINT "template_scoring_criterion_template_id_salon_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."salon_template"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "invitation_organizationId_idx" ON "invitation" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "invitation_email_idx" ON "invitation" USING btree ("email");--> statement-breakpoint
CREATE INDEX "member_organizationId_idx" ON "member" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "member_userId_idx" ON "member" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "member_org_number_uidx" ON "member" USING btree ("organization_id","member_number");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_slug_uidx" ON "organization" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "salon_organizationId_idx" ON "salon" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "salon_year_month_idx" ON "salon" USING btree ("year","month");--> statement-breakpoint
CREATE INDEX "salon_status_idx" ON "salon" USING btree ("status");--> statement-breakpoint
CREATE INDEX "salon_category_salonId_idx" ON "salon_category" USING btree ("salon_id");--> statement-breakpoint
CREATE INDEX "salon_criterion_salonId_idx" ON "salon_scoring_criterion" USING btree ("salon_id");--> statement-breakpoint
CREATE INDEX "score_submissionId_idx" ON "score" USING btree ("submission_id");--> statement-breakpoint
CREATE INDEX "score_judgeId_idx" ON "score" USING btree ("judge_id");--> statement-breakpoint
CREATE INDEX "score_criterion_scoreId_idx" ON "score_criterion_value" USING btree ("score_id");--> statement-breakpoint
CREATE INDEX "submission_salonCategoryId_idx" ON "submission" USING btree ("salon_category_id");--> statement-breakpoint
CREATE INDEX "submission_memberId_idx" ON "submission" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "template_slot_templateId_idx" ON "template_category_slot" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "template_criterion_templateId_idx" ON "template_scoring_criterion" USING btree ("template_id");