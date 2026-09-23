import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import {
  navigateWithProductImportHandoff,
  readProductImportHandoff,
} from "../src/lib/product-import-flow.ts";

const values = new Map();

beforeEach(() => {
  values.clear();
  globalThis.sessionStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
});

test("successful import is stored before navigation to the product screen", () => {
  const productUrl = "https://www.bike-discount.de/en/test-product";
  const result = {
    ok: true,
    status: "PARTIAL",
    product: {
      supplier: "BIKE_DISCOUNT",
      sourceUrl: productUrl,
      title: "Team jersey 2026",
      brand: null,
      primaryImageUrl: "https://example.com/product.jpg",
      imageUrls: ["https://example.com/product.jpg"],
      supplierSku: "TEST-1",
      gtin: null,
      attributes: [],
      variants: [{ id: "m", size: "M" }],
      availability: "IN_STOCK",
      importedAt: "2026-09-22T00:00:00.000Z",
      warnings: [],
      fieldSources: {},
    },
  };
  const destinations = [];

  const destination = navigateWithProductImportHandoff(
    productUrl,
    result,
    (value) => destinations.push(value),
  );

  assert.deepEqual(destinations, [destination]);
  const flowId = new URL(destination, "http://localhost").searchParams.get("flow");
  assert.ok(flowId);
  const handoff = readProductImportHandoff(flowId);
  assert.equal(handoff?.version, 1);
  assert.equal(typeof handoff?.createdAt, "number");
  assert.equal(handoff?.productUrl, productUrl);
  assert.deepEqual(handoff?.result, result);
});

test("recoverable import failure is preserved for the manual fallback", () => {
  const productUrl = "https://www.bike24.com/test-product";
  const result = {
    ok: false,
    error: {
      code: "BLOCKED_BY_SUPPLIER",
      message: "The supplier did not allow this server-side request.",
    },
  };

  const destination = navigateWithProductImportHandoff(productUrl, result, () => {});
  const flowId = new URL(destination, "http://localhost").searchParams.get("flow");
  assert.ok(flowId);

  const handoff = readProductImportHandoff(flowId);
  assert.equal(handoff?.productUrl, productUrl);
  assert.deepEqual(handoff?.result, result);
});
