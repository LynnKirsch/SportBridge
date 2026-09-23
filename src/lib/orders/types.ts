import type { SupplierCode } from "@/lib/suppliers/types";

export type CustomerOrderItemInput = {
  productUrl: string;
  submittedName?: string;
  submittedSku?: string;
  submittedVariant?: string;
  submittedColor?: string;
  quantity: number;
  comment?: string;
};

export type CreateCustomerOrderInput = {
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  items: CustomerOrderItemInput[];
};

export type ValidatedOrderItem = {
  productUrl: string;
  submittedName: string | null;
  submittedSku: string | null;
  submittedVariant: string | null;
  submittedColor: string | null;
  quantity: number;
  comment: string | null;
};

export type ValidatedCustomerOrder = {
  supplier: SupplierCode;
  contactName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  items: ValidatedOrderItem[];
};

export type CreatedCustomerOrder = {
  id: string;
  orderNumber: string;
  status: "UNDER_REVIEW";
  supplier: SupplierCode;
  itemCount: number;
};
