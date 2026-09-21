---
name: sports-purchase-service
description: Apply the product rules for the sports-goods purchasing intermediary when changing orders, quotes, payments, purchasing, warehouse intake, consolidation, shipping, tracking, or their data models and UI.
---

# Sports purchase service

Use this skill for changes to the service's business workflow or the code and UI that enforce it. Do not load it for isolated styling, copy, tooling, or infrastructure work unless that task also changes domain behavior.

## Source of truth

The implemented code, database schema, tests, and current task define existing behavior. The product rules describe required behavior but do not prove that a feature is already implemented.

Read [references/product-rules.md](references/product-rules.md) when the task affects orders, calculations, payments, purchase execution, warehouse intake, consolidation, delivery, tracking, roles, notifications, or related persistence.

## Essential invariants

- One customer order belongs to one supported store and may contain several items from that store.
- Purchase is all-or-nothing: do not confirm a partial purchase.
- Product pages are not scraped; customer and manager data are stored explicitly.
- Published calculations are immutable versioned snapshots.
- The intermediary fee is 10% of the goods cost only.
- A customer order may belong to at most one active outbound shipment.
- Financial, status, and employee actions remain auditable.
- The future parcel-forwarding scenario must not be exposed until explicitly requested.

## Implementation guidance

- Keep domain rules in server-side services; client-side validation is only a usability layer.
- Update the minimum connected set of schema, service, UI, and tests needed for a complete change.
- Preserve historical prices, rates, confirmations, payments, and status events instead of overwriting them.
- Treat external payment links, carrier data, and tracking events as manually managed until an integration is explicitly added.
- Prefer configurable stores, warehouses, routes, carriers, currencies, and tariffs over country-specific field names.

Use the repository's configured versions and package manager. Do not replace the stack because a different library is personally preferred.
