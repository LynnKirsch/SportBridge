import type { ProductImportErrorCode } from "./types";

export class ProductImportError extends Error {
  readonly code: ProductImportErrorCode;

  constructor(code: ProductImportErrorCode, message: string) {
    super(message);
    this.name = "ProductImportError";
    this.code = code;
  }
}

export function toProductImportError(error: unknown): ProductImportError {
  if (error instanceof ProductImportError) {
    return error;
  }

  return new ProductImportError(
    "FETCH_FAILED",
    "The supplier product page could not be fetched.",
  );
}
