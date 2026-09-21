-- AlterTable
ALTER TABLE "OrderItemSubmission" ALTER COLUMN "submittedName" DROP NOT NULL,
ALTER COLUMN "displayedUnitPrice" DROP NOT NULL,
ALTER COLUMN "displayedCurrencyCode" DROP NOT NULL,
ALTER COLUMN "imageStorageKey" DROP NOT NULL;

-- AddCheckConstraint
ALTER TABLE "OrderItemSubmission" ADD CONSTRAINT "chk_order_item_submission_displayed_price_currency_pair" CHECK (("displayedUnitPrice" IS NULL) = ("displayedCurrencyCode" IS NULL));
