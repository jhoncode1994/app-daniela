-- Create providers and attach each shift to a provider
CREATE TABLE "providers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "providers_pkey" PRIMARY KEY ("id")
);

INSERT INTO "providers" ("id", "name", "active", "created_at", "updated_at")
VALUES
  (gen_random_uuid(), 'Alma Rosa', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'Bizcocho', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

ALTER TABLE "work_shifts" ADD COLUMN "provider_id" UUID;

UPDATE "work_shifts"
SET "provider_id" = (
  SELECT "id" FROM "providers" WHERE "name" = 'Alma Rosa' ORDER BY "created_at" ASC LIMIT 1
)
WHERE "provider_id" IS NULL;

ALTER TABLE "work_shifts" ALTER COLUMN "provider_id" SET NOT NULL;

ALTER TABLE "work_shifts"
ADD CONSTRAINT "work_shifts_provider_id_fkey"
FOREIGN KEY ("provider_id") REFERENCES "providers"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "work_shifts_provider_id_work_date_idx" ON "work_shifts"("provider_id", "work_date");

ALTER TABLE "payments" ADD COLUMN "provider_id" UUID;

ALTER TABLE "payments"
ADD CONSTRAINT "payments_provider_id_fkey"
FOREIGN KEY ("provider_id") REFERENCES "providers"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "payments_provider_id_idx" ON "payments"("provider_id");
