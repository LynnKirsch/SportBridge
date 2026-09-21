# Product rules

Read only the sections relevant to the current task.

## 1. Product scope

The MVP is a purchasing intermediary for sports goods. A customer sends product links; a manager verifies the full order, calculates the price, receives payment, purchases the goods, records their arrival at one warehouse in Kazakhstan, and arranges delivery to Russia.

Initial supported stores:

- BIKE24 — `bike24.com`;
- Bike-Discount — `bike-discount.de`;
- Bike-Components — `bike-components.de`;
- R2-bike — `r2-bike.com`.

The store list is configurable. Reading a URL hostname for validation is allowed; fetching or parsing the product page is outside the MVP.

Delivery within Russia ends at a CDEK pickup point. The international carrier and detailed route are not yet fixed and must remain configurable and manually entered.

## 2. Orders and items

- One order contains items from one store only.
- Several items from that store are allowed.
- Items from another store require another order.
- Separate orders may later be consolidated at the Kazakhstan warehouse.
- Partial purchase and automatic substitution are not allowed.
- If any item becomes unavailable before purchase, the complete purchase is not confirmed and the order returns for clarification or cancellation.

Required customer item data:

- product URL;
- name;
- article/SKU, or an explicit “not shown” value;
- size, or an explicit “not applicable” value;
- color, or an explicit “not applicable” value;
- quantity;
- displayed price and currency;
- uploaded image or screenshot;
- comment, or an explicit “no comment” value.

Store customer input separately from manager-verified values. Do not silently overwrite the original submission.

## 3. First calculation and payment

The first calculation covers purchase-stage costs:

- goods cost;
- currency conversion using the official Bank of Russia rate for the calculation date;
- store-to-warehouse delivery when known;
- bank fee;
- intermediary fee.

The intermediary fee is 10% of the goods cost only. Do not include store delivery, bank fees, customs, international delivery, CDEK delivery, or later adjustments in its base.

A published calculation:

- is valid for 30 minutes;
- stores the source amounts, currencies, Bank of Russia rate, RUB amounts, line items, timestamps, and version;
- cannot be edited in place;
- may be replaced only by a new version;
- requires explicit customer confirmation.

Payment is manual in the MVP. A manager provides a payment link or bank details, the customer may report payment and upload proof, and the manager confirms receipt. Do not imply acquiring, automatic reconciliation, receipt issuance, or online cash-register integration.

If the price rises before purchase, block purchase and request customer approval through a new calculation or adjustment. Do not purchase at the higher price silently.

## 4. Purchase

The intermediary performs the purchase. Record the store order number, purchase time, actual amount and currency, proof, expected box count, incoming tracking numbers, and expected warehouse arrival.

Confirm purchase only after every item in the order was purchased in the required quantity. If purchase becomes impossible after customer payment, move the order to a manual-resolution state; do not invent a refund workflow that has not been approved.

## 5. Warehouse intake

The MVP has one warehouse in Kazakhstan, represented as configurable data rather than country-specific code.

For each incoming physical box record:

- order and purchase;
- tracking number;
- arrival date;
- exterior photo;
- weight;
- length, width, and height;
- packaging condition and visible damage;
- receiving employee.

Do not open the box, inspect contents, test goods, or add paid warehouse services unless a later task explicitly introduces them.

One store order may arrive in several boxes. Mark the order fully received only when all expected boxes are registered or an authorized manager corrects the expected count with an audit entry.

## 6. Consolidation and second calculation

One outbound shipment may contain one or several fully received orders belonging to the same customer and compatible recipient. An order may belong to at most one active shipment.

Consolidation does not merge or rewrite the original orders. An outbound shipment may contain one or several physical shipping packages.

The second calculation may include:

- international delivery;
- customs costs;
- CDEK delivery;
- approved adjustments.

Do not charge the 10% intermediary fee again. The second calculation uses the same immutable versioning and manual payment confirmation principles as the first. Its validity period remains configurable until the carrier rules are approved.

## 7. Delivery and tracking

Model delivery as ordered legs rather than hard-coded carriers:

1. warehouse in Kazakhstan to Russia;
2. delivery in Russia to a CDEK pickup point.

Until integrations are explicitly implemented, managers enter carriers, tracking numbers, links, expected dates, and status events manually.

The customer sees confirmed item characteristics, charged amounts, paid and outstanding totals, expected delivery information, pickup-point address, receipt conditions, tracking numbers, and status history.

## 8. Roles and notifications

MVP roles:

- customer;
- manager-purchaser;
- technical administrator.

Managers operate orders, calculations, payments, purchases, warehouse intake, and shipments. Technical administrators monitor system health, accounts, errors, notification delivery, and audit records; they should not silently change business data.

Notification channels:

- in-app;
- email;
- Telegram after account binding.

Keep the full sensitive record in the authenticated cabinet. Email and Telegram should contain a short notice and a link, not full payment or personal data.

## 9. Data and audit invariants

- Store money with currency and exact decimal or minor-unit representation; never use binary floating-point for financial calculations.
- Snapshot the exchange rate and calculation lines used for every published version.
- Keep customer-entered and manager-verified item values separately.
- Record actor, time, action, object, and relevant before/after values for financial, status, permission, and logistics changes.
- Archive financial and logistics records instead of deleting them through ordinary UI.
- Store files privately and authorize every download.
- Enforce role and ownership checks on the server for every protected action.

## 10. Architecture baseline

The planned baseline is a modular monolith:

- Next.js 16 App Router and TypeScript;
- Node.js 24 LTS;
- PostgreSQL 18;
- Prisma ORM;
- Better Auth;
- React Hook Form and Zod;
- private S3-compatible object storage;
- SMTP email and Telegram Bot API;
- Vitest and Playwright;
- Docker-based deployment.

The repository configuration and lockfile control exact installed versions. Do not add a separate backend, Python service, microservices, Redis, automatic payment integration, CDEK API, or carrier API unless the current task explicitly introduces them.

## 11. Deferred capabilities

Do not expose or imply the following until explicitly requested:

- customer self-purchase and a personal overseas warehouse address;
- parcel forwarding without intermediary purchase;
- product-page scraping;
- partial purchase or automatic substitutions;
- returns workflow;
- automatic payments, receipts, or online cash register;
- automatic CDEK or international-carrier integration;
- opening and inspecting incoming boxes;
- paid storage or additional warehouse services;
- public unauthenticated tracking;
- referral, loyalty, reviews, blog, or multilingual features.

The future parcel-forwarding scenario may reuse warehouse, shipment, tracking, and notification modules. Preserve that extension point without building its UI or workflow in advance.
