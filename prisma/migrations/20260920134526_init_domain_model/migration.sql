-- CreateEnum
CREATE TYPE "CustomerOrderStatus" AS ENUM ('DRAFT', 'UNDER_REVIEW', 'QUOTED', 'AWAITING_PAYMENT', 'PAID', 'PURCHASING', 'INBOUND_TRANSIT', 'AT_WAREHOUSE', 'OUTBOUND_TRANSIT', 'COMPLETED', 'MANUAL_REVIEW', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SubmissionValueState" AS ENUM ('PROVIDED', 'NOT_SHOWN', 'NOT_APPLICABLE', 'NONE');

-- CreateEnum
CREATE TYPE "ItemAvailability" AS ENUM ('UNKNOWN', 'AVAILABLE', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ACCEPTED', 'EXPIRED', 'SUPERSEDED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "QuoteLineType" AS ENUM ('GOODS', 'SUPPLIER_DELIVERY', 'BANK_FEE', 'INTERMEDIARY_FEE', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('BANK_TRANSFER', 'PAYMENT_LINK', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'CUSTOMER_REPORTED', 'CONFIRMED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SupplierPurchaseStatus" AS ENUM ('PENDING', 'PURCHASED', 'FAILED', 'MANUAL_REVIEW', 'CANCELLED');

-- CreateEnum
CREATE TYPE "IncomingPackageStatus" AS ENUM ('EXPECTED', 'IN_TRANSIT', 'RECEIVED');

-- CreateEnum
CREATE TYPE "PackagingCondition" AS ENUM ('NOT_ASSESSED', 'INTACT', 'DAMAGED');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('DRAFT', 'READY', 'IN_TRANSIT', 'READY_FOR_PICKUP', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ShipmentPackageStatus" AS ENUM ('PLANNED', 'PACKED', 'IN_TRANSIT', 'DELIVERED');

-- CreateEnum
CREATE TYPE "ShipmentLegStatus" AS ENUM ('PLANNED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AuditActorRole" AS ENUM ('CUSTOMER', 'MANAGER_PURCHASER', 'TECHNICAL_ADMIN', 'SYSTEM');

-- CreateTable
CREATE TABLE "Supplier" (
    "id" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" TEXT NOT NULL,
    "primaryHostname" TEXT NOT NULL,
    "websiteUrl" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" TEXT NOT NULL,
    "countryCode" CHAR(2) NOT NULL,
    "region" TEXT,
    "city" TEXT NOT NULL,
    "postalCode" TEXT,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerOrder" (
    "id" UUID NOT NULL,
    "orderNumber" VARCHAR(32) NOT NULL,
    "supplierId" UUID NOT NULL,
    "status" "CustomerOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "customerReference" TEXT,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItemSubmission" (
    "id" UUID NOT NULL,
    "orderItemId" UUID NOT NULL,
    "productUrl" TEXT NOT NULL,
    "submittedName" TEXT NOT NULL,
    "submittedSku" TEXT,
    "submittedSkuState" "SubmissionValueState" NOT NULL,
    "submittedVariant" TEXT,
    "submittedVariantState" "SubmissionValueState" NOT NULL,
    "submittedColor" TEXT,
    "submittedColorState" "SubmissionValueState" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "displayedUnitPrice" DECIMAL(18,2) NOT NULL,
    "displayedCurrencyCode" CHAR(3) NOT NULL,
    "imageStorageKey" TEXT NOT NULL,
    "comment" TEXT,
    "commentState" "SubmissionValueState" NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItemSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItemVerification" (
    "id" UUID NOT NULL,
    "orderItemId" UUID NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "brand" TEXT,
    "supplierSku" TEXT,
    "verifiedVariant" TEXT,
    "verifiedColor" TEXT,
    "verifiedQuantity" INTEGER NOT NULL,
    "verifiedUnitPrice" DECIMAL(18,2) NOT NULL,
    "verifiedCurrencyCode" CHAR(3) NOT NULL,
    "availability" "ItemAvailability" NOT NULL DEFAULT 'UNKNOWN',
    "managerReference" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderItemVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcurementContext" (
    "id" UUID NOT NULL,
    "receivingWarehouseId" UUID NOT NULL,
    "supplierNameSnapshot" TEXT NOT NULL,
    "supplierHostnameSnapshot" TEXT NOT NULL,
    "receivingWarehouseNameSnapshot" TEXT NOT NULL,
    "receivingCountryCode" CHAR(2) NOT NULL,
    "receivingRegion" TEXT,
    "receivingCity" TEXT NOT NULL,
    "receivingPostalCode" TEXT,
    "receivingAddressLine1" TEXT NOT NULL,
    "receivingAddressLine2" TEXT,
    "onwardDestinationCountryCode" CHAR(2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcurementContext_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "procurementContextId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceCurrencyCode" CHAR(3) NOT NULL,
    "settlementCurrencyCode" CHAR(3) NOT NULL,
    "goodsSourceAmount" DECIMAL(18,2) NOT NULL,
    "exchangeRate" DECIMAL(20,8) NOT NULL,
    "exchangeRateSource" TEXT NOT NULL,
    "exchangeRateFetchedAt" TIMESTAMP(3) NOT NULL,
    "goodsConvertedAmount" DECIMAL(18,2) NOT NULL,
    "supplierDeliveryAmount" DECIMAL(18,2),
    "bankFeeAmount" DECIMAL(18,2) NOT NULL,
    "intermediaryFeeRate" DECIMAL(7,6) NOT NULL,
    "intermediaryFeeBaseAmount" DECIMAL(18,2) NOT NULL,
    "intermediaryFeeAmount" DECIMAL(18,2) NOT NULL,
    "totalAmount" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "customerConfirmedAt" TIMESTAMP(3),

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteItem" (
    "id" UUID NOT NULL,
    "quoteId" UUID NOT NULL,
    "orderItemId" UUID,
    "itemNameSnapshot" TEXT NOT NULL,
    "brandSnapshot" TEXT,
    "skuSnapshot" TEXT,
    "variantSnapshot" TEXT,
    "colorSnapshot" TEXT,
    "quantitySnapshot" INTEGER NOT NULL,
    "unitPriceSource" DECIMAL(18,2) NOT NULL,
    "lineTotalSource" DECIMAL(18,2) NOT NULL,
    "sourceCurrencyCode" CHAR(3) NOT NULL,
    "exchangeRate" DECIMAL(20,8) NOT NULL,
    "lineTotalSettlement" DECIMAL(18,2) NOT NULL,
    "settlementCurrencyCode" CHAR(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteLine" (
    "id" UUID NOT NULL,
    "quoteId" UUID NOT NULL,
    "type" "QuoteLineType" NOT NULL,
    "descriptionSnapshot" TEXT NOT NULL,
    "sourceAmount" DECIMAL(18,2),
    "sourceCurrencyCode" CHAR(3),
    "settlementAmount" DECIMAL(18,2) NOT NULL,
    "settlementCurrencyCode" CHAR(3) NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentRecord" (
    "id" UUID NOT NULL,
    "quoteId" UUID NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currencyCode" CHAR(3) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "externalReference" TEXT,
    "comment" TEXT,
    "proofStorageKey" TEXT,
    "customerReportedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierPurchase" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "externalOrderNumber" TEXT,
    "status" "SupplierPurchaseStatus" NOT NULL DEFAULT 'PENDING',
    "actualAmount" DECIMAL(18,2),
    "actualCurrencyCode" CHAR(3),
    "proofStorageKey" TEXT,
    "expectedBoxCount" INTEGER,
    "expectedWarehouseArrival" TIMESTAMP(3),
    "purchasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierPurchaseItem" (
    "id" UUID NOT NULL,
    "supplierPurchaseId" UUID NOT NULL,
    "orderItemId" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "actualUnitPrice" DECIMAL(18,2) NOT NULL,
    "currencyCode" CHAR(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierPurchaseItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncomingPackage" (
    "id" UUID NOT NULL,
    "supplierPurchaseId" UUID NOT NULL,
    "warehouseId" UUID NOT NULL,
    "trackingNumber" TEXT,
    "status" "IncomingPackageStatus" NOT NULL DEFAULT 'EXPECTED',
    "arrivedAt" TIMESTAMP(3),
    "exteriorPhotoKey" TEXT,
    "weightKg" DECIMAL(10,3),
    "lengthCm" DECIMAL(10,2),
    "widthCm" DECIMAL(10,2),
    "heightCm" DECIMAL(10,2),
    "packagingCondition" "PackagingCondition" NOT NULL DEFAULT 'NOT_ASSESSED',
    "visibleDamageNotes" TEXT,
    "receivedByReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncomingPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryDestination" (
    "id" UUID NOT NULL,
    "shipmentId" UUID NOT NULL,
    "recipientNameSnapshot" TEXT NOT NULL,
    "recipientPhoneSnapshot" TEXT NOT NULL,
    "recipientEmailSnapshot" TEXT,
    "countryCode" CHAR(2) NOT NULL,
    "region" TEXT,
    "city" TEXT NOT NULL,
    "postalCode" TEXT,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "pickupPointProvider" TEXT,
    "pickupPointCode" TEXT,
    "pickupPointAddressSnapshot" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryDestination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboundShipment" (
    "id" UUID NOT NULL,
    "shipmentNumber" VARCHAR(32) NOT NULL,
    "originWarehouseId" UUID NOT NULL,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'DRAFT',
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutboundShipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentOrder" (
    "id" UUID NOT NULL,
    "shipmentId" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMP(3),

    CONSTRAINT "ShipmentOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentPackage" (
    "id" UUID NOT NULL,
    "shipmentId" UUID NOT NULL,
    "packageNumber" INTEGER NOT NULL,
    "status" "ShipmentPackageStatus" NOT NULL DEFAULT 'PLANNED',
    "trackingNumber" TEXT,
    "weightKg" DECIMAL(10,3),
    "lengthCm" DECIMAL(10,2),
    "widthCm" DECIMAL(10,2),
    "heightCm" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShipmentPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentLeg" (
    "id" UUID NOT NULL,
    "shipmentId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "status" "ShipmentLegStatus" NOT NULL DEFAULT 'PLANNED',
    "originCountryCode" CHAR(2) NOT NULL,
    "originLabelSnapshot" TEXT NOT NULL,
    "destinationCountryCode" CHAR(2) NOT NULL,
    "destinationLabelSnapshot" TEXT NOT NULL,
    "carrierName" TEXT,
    "trackingNumber" TEXT,
    "trackingUrl" TEXT,
    "expectedDeliveryAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShipmentLeg_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderStatusEvent" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "fromStatus" "CustomerOrderStatus",
    "toStatus" "CustomerOrderStatus" NOT NULL,
    "actorReference" TEXT,
    "actorRole" "AuditActorRole" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorReference" TEXT,
    "actorRole" "AuditActorRole" NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_code_key" ON "Supplier"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_primaryHostname_key" ON "Supplier"("primaryHostname");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_code_key" ON "Warehouse"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerOrder_orderNumber_key" ON "CustomerOrder"("orderNumber");

-- CreateIndex
CREATE INDEX "CustomerOrder_supplierId_idx" ON "CustomerOrder"("supplierId");

-- CreateIndex
CREATE INDEX "CustomerOrder_status_idx" ON "CustomerOrder"("status");

-- CreateIndex
CREATE INDEX "CustomerOrder_customerReference_idx" ON "CustomerOrder"("customerReference");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderItem_id_orderId_key" ON "OrderItem"("id", "orderId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderItemSubmission_orderItemId_key" ON "OrderItemSubmission"("orderItemId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderItemVerification_orderItemId_key" ON "OrderItemVerification"("orderItemId");

-- CreateIndex
CREATE INDEX "ProcurementContext_receivingWarehouseId_idx" ON "ProcurementContext"("receivingWarehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_procurementContextId_key" ON "Quote"("procurementContextId");

-- CreateIndex
CREATE INDEX "Quote_status_idx" ON "Quote"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_orderId_version_key" ON "Quote"("orderId", "version");

-- CreateIndex
CREATE INDEX "QuoteItem_quoteId_idx" ON "QuoteItem"("quoteId");

-- CreateIndex
CREATE INDEX "QuoteItem_orderItemId_idx" ON "QuoteItem"("orderItemId");

-- CreateIndex
CREATE INDEX "QuoteLine_quoteId_type_idx" ON "QuoteLine"("quoteId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteLine_quoteId_sortOrder_key" ON "QuoteLine"("quoteId", "sortOrder");

-- CreateIndex
CREATE INDEX "PaymentRecord_quoteId_idx" ON "PaymentRecord"("quoteId");

-- CreateIndex
CREATE INDEX "PaymentRecord_status_idx" ON "PaymentRecord"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierPurchase_orderId_key" ON "SupplierPurchase"("orderId");

-- CreateIndex
CREATE INDEX "SupplierPurchase_status_idx" ON "SupplierPurchase"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierPurchase_id_orderId_key" ON "SupplierPurchase"("id", "orderId");

-- CreateIndex
CREATE INDEX "SupplierPurchaseItem_supplierPurchaseId_idx" ON "SupplierPurchaseItem"("supplierPurchaseId");

-- CreateIndex
CREATE INDEX "SupplierPurchaseItem_orderId_idx" ON "SupplierPurchaseItem"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierPurchaseItem_orderItemId_orderId_key" ON "SupplierPurchaseItem"("orderItemId", "orderId");

-- CreateIndex
CREATE INDEX "IncomingPackage_supplierPurchaseId_idx" ON "IncomingPackage"("supplierPurchaseId");

-- CreateIndex
CREATE INDEX "IncomingPackage_warehouseId_status_idx" ON "IncomingPackage"("warehouseId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryDestination_shipmentId_key" ON "DeliveryDestination"("shipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "OutboundShipment_shipmentNumber_key" ON "OutboundShipment"("shipmentNumber");

-- CreateIndex
CREATE INDEX "OutboundShipment_originWarehouseId_idx" ON "OutboundShipment"("originWarehouseId");

-- CreateIndex
CREATE INDEX "OutboundShipment_status_idx" ON "OutboundShipment"("status");

-- CreateIndex
CREATE INDEX "ShipmentOrder_orderId_unassignedAt_idx" ON "ShipmentOrder"("orderId", "unassignedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ShipmentOrder_shipmentId_orderId_key" ON "ShipmentOrder"("shipmentId", "orderId");

-- CreateIndex
CREATE UNIQUE INDEX "ShipmentPackage_shipmentId_packageNumber_key" ON "ShipmentPackage"("shipmentId", "packageNumber");

-- CreateIndex
CREATE INDEX "ShipmentLeg_status_idx" ON "ShipmentLeg"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ShipmentLeg_shipmentId_sequence_key" ON "ShipmentLeg"("shipmentId", "sequence");

-- CreateIndex
CREATE INDEX "OrderStatusEvent_orderId_createdAt_idx" ON "OrderStatusEvent"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorReference_createdAt_idx" ON "AuditLog"("actorReference", "createdAt");

-- AddForeignKey
ALTER TABLE "CustomerOrder" ADD CONSTRAINT "CustomerOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "CustomerOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItemSubmission" ADD CONSTRAINT "OrderItemSubmission_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItemVerification" ADD CONSTRAINT "OrderItemVerification_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcurementContext" ADD CONSTRAINT "ProcurementContext_receivingWarehouseId_fkey" FOREIGN KEY ("receivingWarehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "CustomerOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_procurementContextId_fkey" FOREIGN KEY ("procurementContextId") REFERENCES "ProcurementContext"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteLine" ADD CONSTRAINT "QuoteLine_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPurchase" ADD CONSTRAINT "SupplierPurchase_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "CustomerOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPurchaseItem" ADD CONSTRAINT "SupplierPurchaseItem_supplierPurchaseId_orderId_fkey" FOREIGN KEY ("supplierPurchaseId", "orderId") REFERENCES "SupplierPurchase"("id", "orderId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPurchaseItem" ADD CONSTRAINT "SupplierPurchaseItem_orderItemId_orderId_fkey" FOREIGN KEY ("orderItemId", "orderId") REFERENCES "OrderItem"("id", "orderId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomingPackage" ADD CONSTRAINT "IncomingPackage_supplierPurchaseId_fkey" FOREIGN KEY ("supplierPurchaseId") REFERENCES "SupplierPurchase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomingPackage" ADD CONSTRAINT "IncomingPackage_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryDestination" ADD CONSTRAINT "DeliveryDestination_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "OutboundShipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundShipment" ADD CONSTRAINT "OutboundShipment_originWarehouseId_fkey" FOREIGN KEY ("originWarehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentOrder" ADD CONSTRAINT "ShipmentOrder_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "OutboundShipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentOrder" ADD CONSTRAINT "ShipmentOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "CustomerOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentPackage" ADD CONSTRAINT "ShipmentPackage_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "OutboundShipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentLeg" ADD CONSTRAINT "ShipmentLeg_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "OutboundShipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusEvent" ADD CONSTRAINT "OrderStatusEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "CustomerOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "OrderItemSubmission" ADD CONSTRAINT "chk_order_item_submission_quantity_positive" CHECK ("quantity" > 0);

-- AddCheckConstraint
ALTER TABLE "OrderItemSubmission" ADD CONSTRAINT "chk_order_item_submission_displayed_unit_price_nonnegative" CHECK ("displayedUnitPrice" >= 0);

-- AddCheckConstraint
ALTER TABLE "OrderItemVerification" ADD CONSTRAINT "chk_order_item_verification_verified_quantity_positive" CHECK ("verifiedQuantity" > 0);

-- AddCheckConstraint
ALTER TABLE "OrderItemVerification" ADD CONSTRAINT "chk_order_item_verification_verified_unit_price_nonnegative" CHECK ("verifiedUnitPrice" >= 0);

-- AddCheckConstraint
ALTER TABLE "Quote" ADD CONSTRAINT "chk_quote_exchange_rate_positive" CHECK ("exchangeRate" > 0);

-- AddCheckConstraint
ALTER TABLE "Quote" ADD CONSTRAINT "chk_quote_goods_source_amount_nonnegative" CHECK ("goodsSourceAmount" >= 0);

-- AddCheckConstraint
ALTER TABLE "Quote" ADD CONSTRAINT "chk_quote_goods_converted_amount_nonnegative" CHECK ("goodsConvertedAmount" >= 0);

-- AddCheckConstraint
ALTER TABLE "Quote" ADD CONSTRAINT "chk_quote_supplier_delivery_amount_nonnegative" CHECK ("supplierDeliveryAmount" IS NULL OR "supplierDeliveryAmount" >= 0);

-- AddCheckConstraint
ALTER TABLE "Quote" ADD CONSTRAINT "chk_quote_bank_fee_amount_nonnegative" CHECK ("bankFeeAmount" >= 0);

-- AddCheckConstraint
ALTER TABLE "Quote" ADD CONSTRAINT "chk_quote_intermediary_fee_rate_nonnegative" CHECK ("intermediaryFeeRate" >= 0);

-- AddCheckConstraint
ALTER TABLE "Quote" ADD CONSTRAINT "chk_quote_intermediary_fee_base_amount_nonnegative" CHECK ("intermediaryFeeBaseAmount" >= 0);

-- AddCheckConstraint
ALTER TABLE "Quote" ADD CONSTRAINT "chk_quote_intermediary_fee_amount_nonnegative" CHECK ("intermediaryFeeAmount" >= 0);

-- AddCheckConstraint
ALTER TABLE "Quote" ADD CONSTRAINT "chk_quote_total_amount_nonnegative" CHECK ("totalAmount" >= 0);

-- AddCheckConstraint
ALTER TABLE "Quote" ADD CONSTRAINT "chk_quote_lifetime_valid" CHECK ("publishedAt" IS NULL OR "expiresAt" IS NULL OR "expiresAt" > "publishedAt");

-- AddCheckConstraint
ALTER TABLE "QuoteItem" ADD CONSTRAINT "chk_quote_item_quantity_snapshot_positive" CHECK ("quantitySnapshot" > 0);

-- AddCheckConstraint
ALTER TABLE "QuoteItem" ADD CONSTRAINT "chk_quote_item_unit_price_source_nonnegative" CHECK ("unitPriceSource" >= 0);

-- AddCheckConstraint
ALTER TABLE "QuoteItem" ADD CONSTRAINT "chk_quote_item_line_total_source_nonnegative" CHECK ("lineTotalSource" >= 0);

-- AddCheckConstraint
ALTER TABLE "QuoteItem" ADD CONSTRAINT "chk_quote_item_exchange_rate_positive" CHECK ("exchangeRate" > 0);

-- AddCheckConstraint
ALTER TABLE "QuoteItem" ADD CONSTRAINT "chk_quote_item_line_total_settlement_nonnegative" CHECK ("lineTotalSettlement" >= 0);

-- AddCheckConstraint
ALTER TABLE "QuoteLine" ADD CONSTRAINT "chk_quote_line_source_amount_currency_pair" CHECK (("sourceAmount" IS NULL) = ("sourceCurrencyCode" IS NULL));

-- AddCheckConstraint
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "chk_payment_record_amount_nonnegative" CHECK ("amount" >= 0);

-- AddCheckConstraint
ALTER TABLE "SupplierPurchase" ADD CONSTRAINT "chk_supplier_purchase_actual_amount_currency_pair" CHECK (("actualAmount" IS NULL) = ("actualCurrencyCode" IS NULL));

-- AddCheckConstraint
ALTER TABLE "SupplierPurchase" ADD CONSTRAINT "chk_supplier_purchase_actual_amount_nonnegative" CHECK ("actualAmount" IS NULL OR "actualAmount" >= 0);

-- AddCheckConstraint
ALTER TABLE "SupplierPurchase" ADD CONSTRAINT "chk_supplier_purchase_expected_box_count_positive" CHECK ("expectedBoxCount" IS NULL OR "expectedBoxCount" > 0);

-- AddCheckConstraint
ALTER TABLE "SupplierPurchaseItem" ADD CONSTRAINT "chk_supplier_purchase_item_quantity_positive" CHECK ("quantity" > 0);

-- AddCheckConstraint
ALTER TABLE "SupplierPurchaseItem" ADD CONSTRAINT "chk_supplier_purchase_item_actual_unit_price_nonnegative" CHECK ("actualUnitPrice" >= 0);

-- AddCheckConstraint
ALTER TABLE "IncomingPackage" ADD CONSTRAINT "chk_incoming_package_weight_positive" CHECK ("weightKg" IS NULL OR "weightKg" > 0);

-- AddCheckConstraint
ALTER TABLE "IncomingPackage" ADD CONSTRAINT "chk_incoming_package_length_positive" CHECK ("lengthCm" IS NULL OR "lengthCm" > 0);

-- AddCheckConstraint
ALTER TABLE "IncomingPackage" ADD CONSTRAINT "chk_incoming_package_width_positive" CHECK ("widthCm" IS NULL OR "widthCm" > 0);

-- AddCheckConstraint
ALTER TABLE "IncomingPackage" ADD CONSTRAINT "chk_incoming_package_height_positive" CHECK ("heightCm" IS NULL OR "heightCm" > 0);

-- AddCheckConstraint
ALTER TABLE "ShipmentPackage" ADD CONSTRAINT "chk_shipment_package_weight_positive" CHECK ("weightKg" IS NULL OR "weightKg" > 0);

-- AddCheckConstraint
ALTER TABLE "ShipmentPackage" ADD CONSTRAINT "chk_shipment_package_length_positive" CHECK ("lengthCm" IS NULL OR "lengthCm" > 0);

-- AddCheckConstraint
ALTER TABLE "ShipmentPackage" ADD CONSTRAINT "chk_shipment_package_width_positive" CHECK ("widthCm" IS NULL OR "widthCm" > 0);

-- AddCheckConstraint
ALTER TABLE "ShipmentPackage" ADD CONSTRAINT "chk_shipment_package_height_positive" CHECK ("heightCm" IS NULL OR "heightCm" > 0);
