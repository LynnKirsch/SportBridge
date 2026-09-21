# Observability

SportBridge needs application logs so developers and operators can diagnose request failures, latency, and server operations without treating technical output as business history. It writes one structured JSON object per line to standard output (`stdout`). The application does not write log files, rotate them, or send them to an external collector. Those concerns belong to the deployment environment.

## Log contract

Every entry contains:

- `timestamp` — an ISO 8601 timestamp;
- `level` — `debug`, `info`, `warn`, or `error` for application calls;
- `event` — a stable machine-readable name in `<domain>.<action>` form;
- `service` — always `sportbridge`;
- `environment` — the current `NODE_ENV` value.

Request logs additionally contain `requestId`, `method`, `route`, `statusCode`, and `durationMs` when those values are known. Domain identifiers such as `orderId`, `quoteId`, `paymentId`, `supplierPurchaseId`, `shipmentId`, and `userId` may be added only when they are already known to the calling code. Prefer internal IDs for correlation; a human-readable order number may be supplemental but must not be the only identifier.

Operational log events are not business history. Order status changes belong in `OrderStatusEvent`, and user or administrator actions that require an audit trail belong in `AuditLog`.

## Levels

Set `LOG_LEVEL` to control the minimum emitted level. The default is `info` when the variable is absent or invalid.

- `debug`: diagnostic details useful during development or focused investigation;
- `info`: normal lifecycle milestones, including request completion;
- `warn`: recoverable or unexpected conditions requiring attention;
- `error`: failed operations and unhandled request errors.

Production output remains JSON. Do not add a pretty-printer or file transport to the application runtime.

## Request correlation

Route handlers can be wrapped with `withRequestLogging`. The wrapper generates a UUID request ID, creates a child logger containing the request fields, returns the ID in the `x-request-id` response header, and uses the same ID for start, completion, and failure logs.

An incoming `x-request-id` is ignored by default. A deployment may set `trustIncomingRequestId: true` for a route only after a trusted reverse proxy or gateway is responsible for replacing untrusted client values. Accepted upstream IDs are trimmed, limited to 128 characters, and restricted to letters, digits, `.`, `_`, `:`, and `-`. Invalid IDs are replaced with a generated UUID.

Pass the request child logger supplied to the wrapped handler into deeper services. Do not store request state in mutable globals.

## Error logging

Log exceptions under the `err` field:

```ts
requestLogger.error(
  { event: "order.create.failed", orderId, err: error },
  "Order creation failed",
);
```

The logger serializes only the error name, message, and stack. It does not serialize the incoming request, request body, response body, error cause, or arbitrary enumerable error properties. Error messages themselves must not contain secrets or personal data.

## Privacy and redaction

Never pass the following values to the logger:

- passwords, access or refresh tokens, cookies, authorization headers, session identifiers, API keys, or other secrets;
- `DATABASE_URL` or database credentials;
- card data, bank details, or payment-provider secrets;
- complete postal addresses, phone numbers, email addresses, request bodies, or response bodies.

The logger redacts common secret field names as a defense in depth. Redaction is not permission to log arbitrary objects. Prefer an explicit object containing only approved technical fields and internal identifiers.

## Health checks

`GET /api/health` is the initial integration example. It produces request start and completion logs at `info` and returns `x-request-id`. If health probes become too noisy, lower only those route events to `debug` or filter the exact `http.request.*` events for `/api/health` in the deployment collector. Do not disable error logs or global request correlation.

## Future collector integration

Because every line is JSON on `stdout`, a future runtime collector can ingest logs without changing application call sites. Vector, VictoriaLogs, Grafana, Loki, or another observability stack is intentionally not installed now: selecting and operating it is a production deployment concern, not an application-runtime requirement. Configure the chosen collector, parsing, storage, retention, alerting, and any health-check filtering in deployment infrastructure.
