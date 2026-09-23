import type { ProductImportResult } from "@/lib/suppliers/types";

const STORAGE_PREFIX = "sportbridge:product-import:";
const MAX_HANDOFF_AGE_MS = 30 * 60 * 1000;

type ProductImportHandoff = {
  version: 1;
  createdAt: number;
  productUrl: string;
  result: ProductImportResult;
};

export function storeProductImportHandoff(productUrl: string, result: ProductImportResult) {
  const flowId = crypto.randomUUID();
  const handoff: ProductImportHandoff = {
    version: 1,
    createdAt: Date.now(),
    productUrl,
    result,
  };

  sessionStorage.setItem(`${STORAGE_PREFIX}${flowId}`, JSON.stringify(handoff));
  return flowId;
}

export function navigateWithProductImportHandoff(
  productUrl: string,
  result: ProductImportResult,
  navigate: (destination: string) => void,
) {
  const flowId = storeProductImportHandoff(productUrl, result);
  const destination = `/order/new?flow=${encodeURIComponent(flowId)}`;
  navigate(destination);
  return destination;
}

export function readProductImportHandoff(flowId: string): ProductImportHandoff | null {
  const rawValue = sessionStorage.getItem(`${STORAGE_PREFIX}${flowId}`);
  if (!rawValue) return null;

  try {
    const handoff = JSON.parse(rawValue) as Partial<ProductImportHandoff>;
    const isCurrent = handoff.version === 1
      && typeof handoff.createdAt === "number"
      && Date.now() - handoff.createdAt <= MAX_HANDOFF_AGE_MS;

    if (!isCurrent || typeof handoff.productUrl !== "string" || !isImportResult(handoff.result)) {
      sessionStorage.removeItem(`${STORAGE_PREFIX}${flowId}`);
      return null;
    }

    return handoff as ProductImportHandoff;
  } catch {
    sessionStorage.removeItem(`${STORAGE_PREFIX}${flowId}`);
    return null;
  }
}

function isImportResult(value: unknown): value is ProductImportResult {
  if (!value || typeof value !== "object" || !("ok" in value)) return false;

  if (value.ok === true) {
    return "product" in value && Boolean(value.product) && "status" in value;
  }

  return value.ok === false && "error" in value && Boolean(value.error);
}
