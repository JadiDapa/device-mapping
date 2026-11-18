CREATE TABLE "extenders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"zone_id" uuid NOT NULL,
	"from_device_id" uuid,
	"to_device_id" uuid,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"location_detail" text,
	"notes" text,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "extenders" ADD CONSTRAINT "extenders_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extenders" ADD CONSTRAINT "extenders_from_device_id_devices_id_fk" FOREIGN KEY ("from_device_id") REFERENCES "public"."devices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extenders" ADD CONSTRAINT "extenders_to_device_id_devices_id_fk" FOREIGN KEY ("to_device_id") REFERENCES "public"."devices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extenders" ADD CONSTRAINT "extenders_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "extenders_zone_id_idx" ON "extenders" USING btree ("zone_id");