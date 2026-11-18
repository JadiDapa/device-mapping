CREATE TYPE "public"."connection_type" AS ENUM('lan_poe', 'fiber_optic');--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "connection_type" "connection_type" DEFAULT 'lan_poe' NOT NULL;