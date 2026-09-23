import type { CreateCustomerOrderInput } from "./types";

export type OrderFormValues = {
  productUrl: string;
  name: string;
  sku: string;
  variant: string;
  color: string;
  quantity: number;
  comment: string;
  contactFirstName: string;
  contactLastName: string;
  contactEmail: string;
  contactPhone: string;
};

export function buildOrderRequest(values: OrderFormValues): CreateCustomerOrderInput {
  return {
    contactName: [values.contactFirstName.trim(), values.contactLastName.trim()]
      .filter(Boolean)
      .join(" "),
    contactEmail: values.contactEmail,
    contactPhone: values.contactPhone,
    items: [{
      productUrl: values.productUrl,
      submittedName: values.name,
      submittedSku: values.sku,
      submittedVariant: values.variant,
      submittedColor: values.color,
      quantity: values.quantity,
      comment: values.comment,
    }],
  };
}
