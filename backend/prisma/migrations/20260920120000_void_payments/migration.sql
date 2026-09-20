-- Keep voided payments as history instead of deleting them
ALTER TABLE "payments" ADD COLUMN "voided_at" TIMESTAMP(3);
ALTER TABLE "payments" ADD COLUMN "voided_shifts" JSONB;
