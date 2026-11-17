-- Application follow-up reminders and deadlines.
--
-- Non-destructive and additive: two nullable columns and two indexes.
-- Existing rows get NULL (no reminder / no deadline); no data is rewritten.

ALTER TABLE "applications" ADD COLUMN "follow_up_at" TIMESTAMP(3);
ALTER TABLE "applications" ADD COLUMN "deadline_at" TIMESTAMP(3);

CREATE INDEX "applications_organization_id_follow_up_at_idx" ON "applications"("organization_id", "follow_up_at");
CREATE INDEX "applications_organization_id_deadline_at_idx" ON "applications"("organization_id", "deadline_at");
