CREATE TABLE "camera_point_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"camera_point_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"caption" text,
	"display_key" text NOT NULL,
	"thumb_key" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"size_bytes" integer NOT NULL,
	"mime" text NOT NULL,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "camera_points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"zone_id" uuid NOT NULL,
	"name" text NOT NULL,
	"notes" text,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "camera_point_images" ADD CONSTRAINT "camera_point_images_camera_point_id_camera_points_id_fk" FOREIGN KEY ("camera_point_id") REFERENCES "public"."camera_points"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "camera_point_images" ADD CONSTRAINT "camera_point_images_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "camera_points" ADD CONSTRAINT "camera_points_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "camera_points" ADD CONSTRAINT "camera_points_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "camera_point_images_point_idx" ON "camera_point_images" USING btree ("camera_point_id");--> statement-breakpoint
CREATE INDEX "camera_points_zone_id_idx" ON "camera_points" USING btree ("zone_id");--> statement-breakpoint
-- Hand-written (drizzle-kit cannot express DEFERRABLE): lets a reorder swap positions inside one transaction.
ALTER TABLE "camera_point_images" ADD CONSTRAINT "camera_point_images_point_position_unique" UNIQUE ("camera_point_id", "position") DEFERRABLE INITIALLY DEFERRED;
