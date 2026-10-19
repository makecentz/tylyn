-- CreateEnum
CREATE TYPE "ClassStatus" AS ENUM ('REQUESTED', 'SCHEDULED', 'COMPLETED', 'NO_SHOW', 'CANCELLED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "classDate" DATE,
ADD COLUMN     "classLocation" TEXT,
ADD COLUMN     "classStatus" "ClassStatus" NOT NULL DEFAULT 'REQUESTED',
ADD COLUMN     "classTime" TEXT;


-- Ask for a preferred time on the existing 1-on-1 class product
UPDATE "Product"
SET "customFields" = jsonb_insert("customFields", '{2}', '{"key": "preferred_time", "label": "Preferred time", "type": "select", "required": true, "options": ["Morning (9am to 12pm)", "Afternoon (12pm to 4pm)", "Evening (4pm to 8pm)"]}'::jsonb)
WHERE "slug" = 'one-on-one-class'
  AND jsonb_typeof("customFields") = 'array'
  AND jsonb_array_length("customFields") >= 2
  AND NOT "customFields" @> '[{"key": "preferred_time"}]'::jsonb;
