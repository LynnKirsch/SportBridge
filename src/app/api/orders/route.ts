import { NextResponse } from "next/server";

import {
  createCustomerOrder,
  OrderConfigurationError,
  OrderValidationError,
} from "@/lib/orders";
import { withRequestLogging } from "@/lib/logger/request";

export const runtime = "nodejs";

const MAX_REQUEST_BODY_BYTES = 32 * 1024;

export const POST = withRequestLogging(
  async (request, context) => {
    const contentLength = Number(request.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BODY_BYTES) {
      return NextResponse.json({ error: "REQUEST_TOO_LARGE" }, { status: 413 });
    }

    const bodyText = await request.text();
    if (new TextEncoder().encode(bodyText).byteLength > MAX_REQUEST_BODY_BYTES) {
      return NextResponse.json({ error: "REQUEST_TOO_LARGE" }, { status: 413 });
    }

    let body: unknown;
    try {
      body = JSON.parse(bodyText);
    } catch {
      return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
    }

    const startedAt = performance.now();
    try {
      const order = await createCustomerOrder(body);
      const orderLogger = context.logger.child({
        orderId: order.id,
        supplier: order.supplier,
      });

      orderLogger.info(
        {
          event: "order.created",
          itemCount: order.itemCount,
          durationMs: Number((performance.now() - startedAt).toFixed(2)),
        },
        "Customer order created",
      );

      return NextResponse.json({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
      }, { status: 201 });
    } catch (error) {
      if (error instanceof OrderValidationError) {
        return NextResponse.json(
          { error: "VALIDATION_ERROR", fieldErrors: error.fieldErrors },
          { status: 400 },
        );
      }
      if (error instanceof OrderConfigurationError) {
        return NextResponse.json(
          { error: "SUPPLIER_DISABLED", message: error.message },
          { status: 409 },
        );
      }
      throw error;
    }
  },
  { route: "/api/orders" },
);
