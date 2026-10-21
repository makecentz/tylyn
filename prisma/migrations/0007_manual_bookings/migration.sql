-- Orders the owner enters by hand (e.g. a class booked over the phone)
ALTER TABLE "Order" ADD COLUMN "manual" BOOLEAN NOT NULL DEFAULT false;
