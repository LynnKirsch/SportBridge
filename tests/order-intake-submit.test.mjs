import assert from "node:assert/strict";
import { test } from "node:test";

import { buildOrderRequest } from "../src/lib/orders/build-order-request.ts";

test("an imported product and separate name fields produce the order API payload", () => {
  const request = buildOrderRequest({
    productUrl: "https://www.bike-discount.de/en/bike-discount-team-jersey-2026",
    name: "Team jersey 2026 | 20167093",
    sku: "20167093",
    variant: "M",
    color: "синий",
    quantity: 1,
    comment: "Размер M",
    contactFirstName: "  Елена  ",
    contactLastName: "  Кирюшкина ",
    contactEmail: "qa@example.invalid",
    contactPhone: "+70000000000",
  });

  assert.deepEqual(request, {
    contactName: "Елена Кирюшкина",
    contactEmail: "qa@example.invalid",
    contactPhone: "+70000000000",
    items: [{
      productUrl: "https://www.bike-discount.de/en/bike-discount-team-jersey-2026",
      submittedName: "Team jersey 2026 | 20167093",
      submittedSku: "20167093",
      submittedVariant: "M",
      submittedColor: "синий",
      quantity: 1,
      comment: "Размер M",
    }],
  });
});
