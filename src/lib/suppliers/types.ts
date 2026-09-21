export type SupplierCode = "BIKE24" | "BIKE_DISCOUNT";

export type ProductAvailability =
  | "IN_STOCK"
  | "OUT_OF_STOCK"
  | "PREORDER"
  | "BACKORDER"
  | "DISCONTINUED";

export type ProductDataSource =
  | "json-ld"
  | "open-graph"
  | "embedded-json"
  | "html";

export type ProductAttribute = {
  name: string;
  value: string;
};

export type ProductVariant = {
  id?: string;
  sku?: string;
  name?: string;
  size?: string;
  color?: string;
  availability?: ProductAvailability;
};

export type ProductImportWarningCode =
  | "BRAND_UNAVAILABLE"
  | "SKU_UNAVAILABLE"
  | "GTIN_UNAVAILABLE"
  | "ATTRIBUTES_UNAVAILABLE"
  | "VARIANTS_UNAVAILABLE"
  | "VARIANT_AVAILABILITY_UNCONFIRMED"
  | "AVAILABILITY_UNCONFIRMED";

export type ProductImportWarning = {
  code: ProductImportWarningCode;
  message: string;
};

export type NormalizedProductField =
  | "title"
  | "brand"
  | "images"
  | "supplierSku"
  | "gtin"
  | "attributes"
  | "variants"
  | "availability";

export type NormalizedProduct = {
  supplier: SupplierCode;
  sourceUrl: string;
  title: string;
  brand: string | null;
  primaryImageUrl: string;
  imageUrls: string[];
  supplierSku: string | null;
  gtin: string | null;
  attributes: ProductAttribute[];
  variants: ProductVariant[];
  availability: ProductAvailability | null;
  importedAt: string;
  warnings: ProductImportWarning[];
  fieldSources: Partial<Record<NormalizedProductField, ProductDataSource>>;
};

export type ProductImportStatus = "COMPLETE" | "PARTIAL";

export type ProductImportSuccess = {
  ok: true;
  status: ProductImportStatus;
  product: NormalizedProduct;
};

export type ProductImportErrorCode =
  | "INVALID_URL"
  | "UNSUPPORTED_SUPPLIER"
  | "FETCH_FAILED"
  | "BLOCKED_BY_SUPPLIER"
  | "PAGE_NOT_FOUND"
  | "PARSE_FAILED"
  | "RESPONSE_TOO_LARGE"
  | "UNSUPPORTED_CONTENT_TYPE";

export type ProductImportFailure = {
  ok: false;
  error: {
    code: ProductImportErrorCode;
    message: string;
  };
};

export type ProductImportResult = ProductImportSuccess | ProductImportFailure;

export interface SupplierProductAdapter {
  readonly supplier: SupplierCode;
  canHandle(url: URL): boolean;
  importProduct(url: URL): Promise<ProductImportSuccess>;
}
