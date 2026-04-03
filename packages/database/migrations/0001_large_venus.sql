CREATE TYPE "public"."submission_medium" AS ENUM('digital', 'print');--> statement-breakpoint
CREATE TABLE "competition_class" (
	"id" uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"display_order" smallint DEFAULT 0 NOT NULL,
	"auto_promote_threshold" smallint,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "submission" ALTER COLUMN "storage_key" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "submission" ALTER COLUMN "original_filename" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "submission" ALTER COLUMN "file_size_bytes" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "submission" ALTER COLUMN "width_px" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "submission" ALTER COLUMN "height_px" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "member" ADD COLUMN "competition_class_id" uuid;--> statement-breakpoint
ALTER TABLE "salon_category" ADD COLUMN "has_bonus_points" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "salon_category" ADD COLUMN "bonus_points" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "salon_category" ADD COLUMN "allowed_class_ids" text;--> statement-breakpoint
ALTER TABLE "submission" ADD COLUMN "medium" "submission_medium" DEFAULT 'digital' NOT NULL;--> statement-breakpoint
ALTER TABLE "template_category_slot" ADD COLUMN "has_bonus_points" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "template_category_slot" ADD COLUMN "bonus_points" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "template_category_slot" ADD COLUMN "allowed_class_ids" text;--> statement-breakpoint
ALTER TABLE "competition_class" ADD CONSTRAINT "competition_class_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "competition_class_orgId_idx" ON "competition_class" USING btree ("organization_id");