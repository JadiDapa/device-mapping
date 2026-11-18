ALTER TABLE "devices" ADD COLUMN "parent_device_id" uuid;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_parent_device_id_devices_id_fk" FOREIGN KEY ("parent_device_id") REFERENCES "public"."devices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "devices_parent_device_id_idx" ON "devices" USING btree ("parent_device_id");