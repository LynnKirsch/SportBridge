# Customer order intake

The customer starts an order on `/` by entering a product URL. The first and only "Проверить" action calls `POST /api/product-import`; while it runs, the form shows a loading state and blocks a duplicate submission. The result and original URL are stored in a short-lived, session-scoped handoff before navigation to `/order/new`. No global application store or duplicate supplier logic is involved.

`/order/new` is only the product-review and order-details step. It reads the completed handoff, shows either the imported product or the manual fallback, and never asks for the URL a second time. A direct visit without a valid handoff redirects to `/`. Import output is editable and is never treated as manager-verified data. A supplier block such as BIKE24 `BLOCKED_BY_SUPPLIER`, or another recoverable import failure, opens manual entry with the original URL preserved. Invalid URLs and unsupported hostnames remain on `/` for correction. Supplier page prices are intentionally ignored.

`POST /api/orders` derives the supplier from every product URL and accepts contact data plus one or more same-supplier items. The current UI submits one item, while the domain service accepts multiple items so that a later UI extension does not require redesigning the transaction.

The UI asks for given name and family name separately for clarity, then sends and stores them together in the existing `contactName` field. This keeps the API and database contract unchanged while preserving both values in the submitted order.

The service validates and writes `CustomerOrder`, `OrderItem`, `OrderItemSubmission`, and the initial `OrderStatusEvent` atomically. New orders start in `UNDER_REVIEW`. Displayed price, displayed currency, and image storage key are stored as `NULL`.

Supported `Supplier` reference rows are bootstrapped with an idempotent upsert on the unique supplier code inside the same transaction. Database-generated UUIDs are used. A disabled existing supplier remains disabled and rejects new orders.

Public order numbers use `SB-<UTC year>-<base36 timestamp>-<random suffix>`. They do not depend on row counts; the database unique constraint and bounded retry protect against collisions without requiring another migration.
