import { parseSupplierUrl } from "@/lib/suppliers/url-policy";
import type { SupplierCode } from "@/lib/suppliers/types";

import type {
  CreateCustomerOrderInput,
  ValidatedCustomerOrder,
  ValidatedOrderItem,
} from "./types";

const LIMITS = {
  contactName: 120,
  contactEmail: 254,
  contactPhone: 40,
  productUrl: 2048,
  submittedName: 500,
  submittedSku: 120,
  submittedVariant: 200,
  submittedColor: 120,
  comment: 2000,
  items: 25,
  quantity: 100,
} as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class OrderValidationError extends Error {
  readonly fieldErrors: Record<string, string>;

  constructor(fieldErrors: Record<string, string>) {
    super("Order input is invalid.");
    this.name = "OrderValidationError";
    this.fieldErrors = fieldErrors;
  }
}

function requiredString(
  value: unknown,
  field: string,
  maxLength: number,
  errors: Record<string, string>,
): string {
  if (typeof value !== "string" || !value.trim()) {
    errors[field] = "Обязательное поле.";
    return "";
  }

  const normalized = value.trim();
  if (normalized.length > maxLength) {
    errors[field] = `Не более ${maxLength} символов.`;
  }
  return normalized;
}

function optionalString(
  value: unknown,
  field: string,
  maxLength: number,
  errors: Record<string, string>,
): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (typeof value !== "string") {
    errors[field] = "Ожидается текстовое значение.";
    return null;
  }

  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length > maxLength) {
    errors[field] = `Не более ${maxLength} символов.`;
  }
  return normalized;
}

function validateItem(
  value: unknown,
  index: number,
  errors: Record<string, string>,
): { item: ValidatedOrderItem; supplier: SupplierCode | null } {
  const path = `items.${index}`;
  const item = typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
  const productUrl = requiredString(
    item.productUrl,
    `${path}.productUrl`,
    LIMITS.productUrl,
    errors,
  );

  let supplier: SupplierCode | null = null;
  if (productUrl && !errors[`${path}.productUrl`]) {
    try {
      const parsed = parseSupplierUrl(productUrl);
      supplier = parsed.supplier;
    } catch (error) {
      errors[`${path}.productUrl`] =
        error instanceof Error ? error.message : "Некорректная ссылка на товар.";
    }
  }

  const quantity = item.quantity;
  if (
    typeof quantity !== "number" ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > LIMITS.quantity
  ) {
    errors[`${path}.quantity`] = `Количество должно быть целым числом от 1 до ${LIMITS.quantity}.`;
  }

  return {
    supplier,
    item: {
      productUrl,
      submittedName: optionalString(item.submittedName, `${path}.submittedName`, LIMITS.submittedName, errors),
      submittedSku: optionalString(item.submittedSku, `${path}.submittedSku`, LIMITS.submittedSku, errors),
      submittedVariant: optionalString(item.submittedVariant, `${path}.submittedVariant`, LIMITS.submittedVariant, errors),
      submittedColor: optionalString(item.submittedColor, `${path}.submittedColor`, LIMITS.submittedColor, errors),
      quantity: typeof quantity === "number" ? quantity : 0,
      comment: optionalString(item.comment, `${path}.comment`, LIMITS.comment, errors),
    },
  };
}

export function validateCustomerOrderInput(value: unknown): ValidatedCustomerOrder {
  const errors: Record<string, string> = {};
  const input = typeof value === "object" && value !== null
    ? (value as Partial<CreateCustomerOrderInput>)
    : {};

  const contactName = requiredString(input.contactName, "contactName", LIMITS.contactName, errors);
  const contactEmail = optionalString(input.contactEmail, "contactEmail", LIMITS.contactEmail, errors);
  const contactPhone = optionalString(input.contactPhone, "contactPhone", LIMITS.contactPhone, errors);

  if (contactEmail && !EMAIL_PATTERN.test(contactEmail)) {
    errors.contactEmail = "Введите корректный email.";
  }

  const rawItems = Array.isArray(input.items) ? input.items : [];
  if (rawItems.length === 0) {
    errors.items = "Добавьте хотя бы один товар.";
  } else if (rawItems.length > LIMITS.items) {
    errors.items = `В одном заказе может быть не более ${LIMITS.items} товаров.`;
  }

  const validated = rawItems.slice(0, LIMITS.items).map((item, index) =>
    validateItem(item, index, errors),
  );
  const suppliers = new Set(validated.flatMap(({ supplier }) => supplier ? [supplier] : []));

  if (suppliers.size > 1) {
    errors.items = "Все товары одного заказа должны быть из одного магазина.";
  }

  if (Object.keys(errors).length > 0 || suppliers.size !== 1) {
    if (suppliers.size === 0 && !errors.items) {
      errors.items = "Не удалось определить поддерживаемый магазин.";
    }
    throw new OrderValidationError(errors);
  }

  return {
    supplier: [...suppliers][0],
    contactName,
    contactEmail,
    contactPhone,
    items: validated.map(({ item }) => item),
  };
}
