-- Lotes (referencias de trabajo) por proveedor
CREATE TABLE "lots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider_id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "notes" TEXT,
    "units" INTEGER NOT NULL DEFAULT 0,
    "unit_price" INTEGER NOT NULL DEFAULT 0,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lots_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "lots"
ADD CONSTRAINT "lots_provider_id_fkey"
FOREIGN KEY ("provider_id") REFERENCES "providers"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "lots_provider_id_reference_key" ON "lots"("provider_id", "reference");
CREATE INDEX "lots_provider_id_closed_idx" ON "lots"("provider_id", "closed");

-- Las jornadas y los pagos anteriores quedan sin referencia; se asignan editandolos.
ALTER TABLE "work_shifts" ADD COLUMN "lot_id" UUID;

ALTER TABLE "work_shifts"
ADD CONSTRAINT "work_shifts_lot_id_fkey"
FOREIGN KEY ("lot_id") REFERENCES "lots"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "work_shifts_lot_id_work_date_idx" ON "work_shifts"("lot_id", "work_date");

ALTER TABLE "payments" ADD COLUMN "lot_id" UUID;

ALTER TABLE "payments"
ADD CONSTRAINT "payments_lot_id_fkey"
FOREIGN KEY ("lot_id") REFERENCES "lots"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "payments_lot_id_idx" ON "payments"("lot_id");
