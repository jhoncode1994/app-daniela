-- Allow open shifts: check-in without check-out yet
ALTER TABLE "work_shifts" ALTER COLUMN "end_time" DROP NOT NULL;
