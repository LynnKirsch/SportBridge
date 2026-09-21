import { NextResponse } from "next/server";

import { withRequestLogging } from "@/lib/logger/request";
import {
  importSupplierProduct,
  resolveSupplier,
  safeUrlForLogs,
} from "@/lib/suppliers";
import type { ProductImportErrorCode } from "@/lib/suppliers/types";

export const runtime = "nodejs";

const MAX_REQUEST_BODY_BYTES = 4 * 1024;

const ERROR_STATUS: Record<ProductImportErrorCode, number> = {
  INVALID_URL: 400,
  UNSUPPORTED_SUPPLIER: 400,
  PAGE_NOT_FOUND: 404,
  PARSE_FAILED: 422,
  FETCH_FAILED: 502,
  BLOCKED_BY_SUPPLIER: 502,
  RESPONSE_TOO_LARGE: 502,
  UNSUPPORTED_CONTENT_TYPE: 502,
};

export const POST = withRequestLogging(
  async (request, context) => {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const contentLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BODY_BYTES) {
      return NextResponse.json(
        { error: { code: "INVALID_URL", message: "Request body is too large." } },
        { status: 413 },
      );
    }

    const bodyText = await request.text();
    if (new TextEncoder().encode(bodyText).byteLength > MAX_REQUEST_BODY_BYTES) {
      return NextResponse.json(
        { error: { code: "INVALID_URL", message: "Request body is too large." } },
        { status: 413 },
      );
    }

    let body: unknown;
    try {
      body = JSON.parse(bodyText);
    } catch {
      return NextResponse.json(
        { error: { code: "INVALID_URL", message: "A JSON body is required." } },
        { status: 400 },
      );
    }

    const url =
      typeof body === "object" && body !== null && "url" in body
        ? (body as { url?: unknown }).url
        : undefined;
    if (typeof url !== "string") {
      return NextResponse.json(
        { error: { code: "INVALID_URL", message: "The url field must be a string." } },
        { status: 400 },
      );
    }

    let supplier: string | undefined;
    let safeUrl: string | undefined;
    try {
      const resolved = resolveSupplier(url);
      supplier = resolved.adapter.supplier;
      safeUrl = safeUrlForLogs(resolved.url);
    } catch {
      // The importer returns the structured URL error below.
    }

    const importLogger = context.logger.child({
      component: "supplier-product-import",
      supplier,
      source: safeUrl,
    });
    const startedAt = performance.now();
    const result = await importSupplierProduct(url);
    const durationMs = Number((performance.now() - startedAt).toFixed(2));

    importLogger.info(
      {
        event: "supplier.import.completed",
        durationMs,
        importStatus: result.ok ? result.status : result.error.code,
        imageCount: result.ok ? result.product.imageUrls.length : 0,
        variantCount: result.ok ? result.product.variants.length : 0,
        warningCount: result.ok ? result.product.warnings.length : 0,
      },
      "Supplier product import completed",
    );

    if (!result.ok) {
      return NextResponse.json(result, { status: ERROR_STATUS[result.error.code] });
    }

    return NextResponse.json(result);
  },
  { route: "/api/dev/product-import" },
);
