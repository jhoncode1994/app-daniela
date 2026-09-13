CREATE TYPE "PaymentStatus" AS ENUM ('PENDIENTE', 'PAGADA');

CREATE TABLE "workers" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "hourly_rate" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "work_shifts" (
    "id" UUID NOT NULL,
    "worker_id" UUID NOT NULL,
    "work_date" DATE NOT NULL,
    "start_time" VARCHAR(5) NOT NULL,
    "end_time" VARCHAR(5) NOT NULL,
    "meal_break_minutes" INTEGER NOT NULL,
    "gross_minutes" INTEGER NOT NULL,
    "net_minutes" INTEGER NOT NULL,
    "hourly_rate" INTEGER NOT NULL,
    "earned_amount" INTEGER NOT NULL,
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDIENTE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_shifts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "worker_id" UUID NOT NULL,
    "payment_date" DATE NOT NULL,
    "amount" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payment_shifts" (
    "payment_id" UUID NOT NULL,
    "shift_id" UUID NOT NULL,

    CONSTRAINT "payment_shifts_pkey" PRIMARY KEY ("payment_id","shift_id")
);

CREATE UNIQUE INDEX "payment_shifts_shift_id_key" ON "payment_shifts"("shift_id");
CREATE INDEX "work_shifts_worker_id_work_date_idx" ON "work_shifts"("worker_id", "work_date");
CREATE INDEX "work_shifts_payment_status_idx" ON "work_shifts"("payment_status");
CREATE INDEX "payments_worker_id_idx" ON "payments"("worker_id");

ALTER TABLE "work_shifts" ADD CONSTRAINT "work_shifts_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_shifts" ADD CONSTRAINT "payment_shifts_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_shifts" ADD CONSTRAINT "payment_shifts_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "work_shifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
