import { bike24Adapter } from "./adapters/bike24";
import { bikeDiscountAdapter } from "./adapters/bike-discount";
import { ProductImportError } from "./errors";
import type { SupplierProductAdapter } from "./types";
import { parseSupplierUrl } from "./url-policy";

const adapters: readonly SupplierProductAdapter[] = [
  bike24Adapter,
  bikeDiscountAdapter,
];

export type ResolvedSupplier = {
  adapter: SupplierProductAdapter;
  url: URL;
};

export function resolveSupplier(rawUrl: string): ResolvedSupplier {
  const { supplier, url } = parseSupplierUrl(rawUrl);
  const adapter = adapters.find(
    (candidate) => candidate.supplier === supplier && candidate.canHandle(url),
  );

  if (!adapter) {
    throw new ProductImportError(
      "UNSUPPORTED_SUPPLIER",
      "No product importer is configured for this supplier.",
    );
  }

  return { adapter, url };
}
