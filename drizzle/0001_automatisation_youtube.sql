CREATE TYPE "public"."run_kind" AS ENUM('youtube', 'planification');--> statement-breakpoint
CREATE TABLE "sync_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "run_kind" NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"ok" boolean,
	"summary" text,
	"error" text
);
--> statement-breakpoint
ALTER TABLE "sheets" ADD COLUMN "replay_of" uuid;--> statement-breakpoint
ALTER TABLE "sheets" ADD COLUMN "ai_drafted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "channel_id" text;--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "detected_at" timestamp with time zone;