import { randomBytes } from "node:crypto";

import {
  AuditActorRole,
  CustomerOrderStatus,
  SubmissionValueState,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import type { SupplierCode } from "@/lib/suppliers/types";

import type { CreatedCustomerOrder } from "./types";
import { validateCustomerOrderInput } from "./validation";

const SUPPLIERS: Record<SupplierCode, {
  code: SupplierCode;
  name: string;
  primaryHostname: string;
  websiteUrl: string;
}> = {
  BIKE24: {
    code: "BIKE24",
    name: "BIKE24",
    primaryHostname: "bike24.com",
    websiteUrl: "https://www.bike24.com",
  },
  BIKE_DISCOUNT: {
    code: "BIKE_DISCOUNT",
    name: "Bike-Discount",
    primaryHostname: "bike-discount.de",
    websiteUrl: "https://www.bike-discount.de",
  },
};

export class OrderConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderConfigurationError";
  }
}

function generateOrderNumber(): string {
  const year = new Date().getUTCFullYear();
  const timestamp = Date.now().toString(36).toUpperCase();
  const entropy = randomBytes(4).toString("hex").toUpperCase();
  return `SB-${year}-${timestamp}-${entropy}`;
}

function hasUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

function stateFor(value: string | null): "PROVIDED" | "NOT_SHOWN" {
  return value ? SubmissionValueState.PROVIDED : SubmissionValueState.NOT_SHOWN;
}

export async function createCustomerOrder(input: unknown): Promise<CreatedCustomerOrder> {
  const validated = validateCustomerOrderInput(input);
  const supplierReference = SUPPLIERS[validated.supplier];

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(async (transaction) => {
        const supplier = await transaction.supplier.upsert({
          where: { code: supplierReference.code },
          update: {},
          create: supplierReference,
          select: { id: true, enabled: true },
        });

        if (!supplier.enabled) {
          throw new OrderConfigurationError("Этот магазин временно недоступен для новых заказов.");
        }

        const order = await transaction.customerOrder.create({
          data: {
            orderNumber: generateOrderNumber(),
            supplierId: supplier.id,
            status: CustomerOrderStatus.UNDER_REVIEW,
            contactName: validated.contactName,
            contactEmail: validated.contactEmail,
            contactPhone: validated.contactPhone,
            items: {
              create: validated.items.map((item) => ({
                submission: {
                  create: {
                    productUrl: item.productUrl,
                    submittedName: item.submittedName,
                    submittedSku: item.submittedSku,
                    submittedSkuState: stateFor(item.submittedSku),
                    submittedVariant: item.submittedVariant,
                    submittedVariantState: stateFor(item.submittedVariant),
                    submittedColor: item.submittedColor,
                    submittedColorState: stateFor(item.submittedColor),
                    quantity: item.quantity,
                    displayedUnitPrice: null,
                    displayedCurrencyCode: null,
                    imageStorageKey: null,
                    comment: item.comment,
                    commentState: item.comment
                      ? SubmissionValueState.PROVIDED
                      : SubmissionValueState.NONE,
                  },
                },
              })),
            },
            statusHistory: {
              create: {
                fromStatus: null,
                toStatus: CustomerOrderStatus.UNDER_REVIEW,
                actorRole: AuditActorRole.CUSTOMER,
                reason: "Customer submitted order for manager review.",
              },
            },
          },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            _count: { select: { items: true } },
          },
        });

        return {
          id: order.id,
          orderNumber: order.orderNumber,
          status: CustomerOrderStatus.UNDER_REVIEW,
          supplier: validated.supplier,
          itemCount: order._count.items,
        };
      });
    } catch (error) {
      if (hasUniqueConstraintError(error) && attempt < 2) continue;
      throw error;
    }
  }

  throw new Error("Could not allocate a unique order number.");
}
