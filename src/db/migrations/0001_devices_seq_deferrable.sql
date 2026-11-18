-- Custom migration: drizzle-kit cannot express DEFERRABLE constraints.
-- Deferred uniqueness lets a renumber (reorder / delete / move zone) rewrite
-- seq values inside one transaction without tripping over intermediate
-- duplicates; the check runs at COMMIT.
ALTER TABLE "devices"
  ADD CONSTRAINT "devices_zone_seq_unique"
  UNIQUE ("zone_id", "seq") DEFERRABLE INITIALLY DEFERRED;
