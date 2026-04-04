ALTER TABLE "salon" ADD COLUMN "medium" "submission_medium" DEFAULT 'digital' NOT NULL;--> statement-breakpoint
ALTER TABLE "salon_template" ADD COLUMN "medium" "submission_medium" DEFAULT 'digital' NOT NULL;--> statement-breakpoint
ALTER TABLE "submission" DROP COLUMN "medium";