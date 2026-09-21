import { toProductImportError } from "./errors";
import { resolveSupplier } from "./resolver";
import type { ProductImportResult } from "./types";

export type { NormalizedProduct, SupplierProductAdapter } from "./types";
export { resolveSupplier } from "./resolver";
export { safeUrlForLogs } from "./url-policy";

export async function importSupplierProduct(rawUrl: string): Promise<ProductImportResult> {
  try {
    const { adapter, url } = resolveSupplier(rawUrl);
    return await adapter.importProduct(url);
  } catch (error) {
    const importError = toProductImportError(error);
    return {
      ok: false,
      error: {
        code: importError.code,
        message: importError.message,
      },
    };
  }
}
