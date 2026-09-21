# Supplier Product Import spike

## Назначение

Supplier Product Importer проверяет, можно ли по публичному URL карточки товара получить идентификационные данные перед созданием клиентской позиции. Это исследовательский слой, а не финальный публичный API и не источник коммерческой цены заказа.

Spike поддерживает только:

- BIKE24: `bike24.com`, `www.bike24.com`;
- Bike-Discount: `bike-discount.de`, `www.bike-discount.de`.

Importer не авторизуется в магазине, не использует клиентские cookies, не вызывает checkout или закрытые API, не обходит CAPTCHA/Cloudflare и не запускает browser rendering. Он ничего не записывает в PostgreSQL, не создаёт `CustomerOrder`, `OrderItem` или `Quote` и не скачивает изображения в постоянное storage.

## Что импортируется

Внутренний тип `NormalizedProduct` имеет следующую структуру:

```ts
type NormalizedProduct = {
  supplier: "BIKE24" | "BIKE_DISCOUNT";
  sourceUrl: string;
  title: string;
  brand: string | null;
  primaryImageUrl: string;
  imageUrls: string[];
  supplierSku: string | null;
  gtin: string | null;
  attributes: Array<{ name: string; value: string }>;
  variants: Array<{
    id?: string;
    sku?: string;
    name?: string;
    size?: string;
    color?: string;
    availability?:
      | "IN_STOCK"
      | "OUT_OF_STOCK"
      | "PREORDER"
      | "BACKORDER"
      | "DISCONTINUED";
  }>;
  availability:
    | "IN_STOCK"
    | "OUT_OF_STOCK"
    | "PREORDER"
    | "BACKORDER"
    | "DISCONTINUED"
    | null;
  importedAt: string;
  warnings: Array<{ code: string; message: string }>;
  fieldSources: Partial<
    Record<
      | "title"
      | "brand"
      | "images"
      | "supplierSku"
      | "gtin"
      | "attributes"
      | "variants"
      | "availability",
      "json-ld" | "open-graph" | "embedded-json" | "html"
    >
  >;
};
```

Минимум успешного разбора — `title` и хотя бы одно корректное HTTP(S)-изображение. Отсутствие brand, SKU, GTIN, attributes, variants или однозначной availability даёт `PARTIAL` и машинно различимые warnings, а не выдуманные значения.

Исходные image URLs приводятся к абсолютному HTTP(S) виду и дедуплицируются. `data:` и `javascript:` не принимаются. Первый надёжно найденный URL становится `primaryImageUrl`.

## Что намеренно не импортируется

В `NormalizedProduct` отсутствуют:

- price, sale price и VAT;
- settlement price и курс валют;
- доставка магазина;
- банковская и посредническая комиссии;
- итоговый `Quote`.

JSON-LD и embedded state магазинов могут технически содержать price. Parser эти поля не маппит и не возвращает. Подтверждённую закупочную цену и все коммерческие составляющие MVP вводит менеджер.

## Архитектура

```text
POST /api/dev/product-import
  -> SupplierResolver
     -> строгая проверка URL и hostname
     -> BIKE24 adapter | Bike-Discount adapter
        -> защищённый HTTP(S) fetch
        -> JSON-LD
        -> OpenGraph fallback
        -> supplier-specific HTML / embedded JSON
        -> NormalizedProduct или structured error
```

`SupplierResolver` сравнивает нормализованный hostname только с полным значением из allowlist. Например, `evil-bike24.com` не является BIKE24. Общий `SupplierProductAdapter` предоставляет `supplier`, `canHandle(url)` и `importProduct(url)`; plugin framework и DI container не используются.

Parsing priority:

1. JSON-LD `Product`;
2. OpenGraph/meta;
3. ограниченные supplier-specific DOM selectors;
4. supplier-specific embedded JSON для вариантов.

Для DOM parsing используется Cheerio. Regex не используется как общий HTML parser.

### BIKE24 adapter

Adapter подготовлен к чтению JSON-LD `Product`, OpenGraph, product gallery и таблицы Fact Sheet. Однако live server-side GET всех трёх проверенных карточек 21 сентября 2026 года получил `403 Forbidden` от Akamai. Browser rendering и anti-bot bypass запрещены, поэтому в текущем spike adapter честно возвращает `BLOCKED_BY_SUPPLIER`.

По публично индексируемому содержимому карточек видны title, изображения, Fact Sheet, Item Code и GTIN, но importer не считает эти данные live-подтверждёнными, пока обычный server request заблокирован.

### Bike-Discount adapter

На live-страницах adapter использует:

- JSON-LD `Product` для title, brand, primary image, SKU, GTIN и однозначной availability;
- OpenGraph как fallback для title и images;
- gallery HTML для дополнительных image URLs;
- пары `name: value` из product description для характеристик;
- `data-nele-variant-data` для variant id, supplier SKU, size/name и явного boolean availability.

Embedded variant state также содержит цены, но adapter выбирает только перечисленные идентификационные поля и availability.

## Failure и partial-result model

Ошибки имеют машинные коды:

- `INVALID_URL`;
- `UNSUPPORTED_SUPPLIER`;
- `FETCH_FAILED`;
- `BLOCKED_BY_SUPPLIER`;
- `PAGE_NOT_FOUND`;
- `PARSE_FAILED`;
- `RESPONSE_TOO_LARGE`;
- `UNSUPPORTED_CONTENT_TYPE`.

Успешный ответ имеет статус `COMPLETE` или `PARTIAL`. Например, title и images без variants остаются полезным partial import; warnings объясняют, какие данные не подтверждены.

## SSRF-защита и сетевые ограничения

Fetcher применяет следующие ограничения:

- точный allowlist hostname, без substring matching;
- только `http:`/`https:` и стандартные порты 80/443;
- URL с credentials запрещены;
- localhost, произвольные домены и URL на IP-адресах не проходят supplier allowlist;
- все DNS-ответы проверяются на loopback, private, link-local, reserved, documentation и multicast ranges IPv4/IPv6;
- соединение выполняется с уже проверенным IP, а TLS certificate проверяется для исходного hostname — это закрывает окно DNS rebinding между lookup и connect;
- каждый redirect обрабатывается вручную, повторно проходит URL/DNS policy и не может перейти к другому supplier;
- максимум 3 redirects;
- timeout одного запроса — 10 секунд;
- максимум HTML response — 2 MiB, включая streaming responses без `Content-Length`;
- разрешены только `text/html` и `application/xhtml+xml`;
- не передаются cookies, `Authorization` или пользовательские headers;
- используется честный `SportBridge product-import-spike/0.1` User-Agent без маскировки под браузер.

CDN supplier может менять публичные IP между отдельными импортами; каждый новый импорт выполняет DNS-проверку заново. Если supplier начинает требовать JavaScript, challenge или пользовательскую сессию, результатом остаётся limitation, а не попытка обхода.

## Redirect policy

Redirect destination сначала разрешается относительно текущего URL, затем полностью повторяет supplier URL policy и DNS/IP validation. Cross-supplier redirect запрещён. Ответ без `Location` и цепочка длиннее трёх переходов дают `FETCH_FAILED`.

## Internal endpoint и logging

`POST /api/dev/product-import` принимает:

```json
{ "url": "https://www.bike-discount.de/en/..." }
```

В production endpoint возвращает `404`. В development он ограничивает request body 4 KiB, не обращается к Prisma и использует `withRequestLogging` и child logger. Логи содержат request ID, supplier, hostname + pathname без query string, статус, duration, количество images/variants/warnings. HTML, response body магазина, входной body, cookies и headers не логируются.

## Manual test matrix

Live-проверка выполнена 21 сентября 2026 года обычными server requests без browser rendering и обходов.

| Supplier | URL / товар | Title | Brand | Primary / gallery | SKU | GTIN | Attributes | Variants | Availability | Result / warnings |
|---|---|---|---|---|---|---|---:|---:|---|---|
| BIKE24 | `https://www.bike24.com/p21065022.html` — Competizione 4 Jersey | — | — | — | — | — | — | — | — | `BLOCKED_BY_SUPPLIER`, HTTP 403 |
| BIKE24 | `https://www.bike24.com/p245956.html` — ORTLIEB Mounting Set | — | — | — | — | — | — | — | — | `BLOCKED_BY_SUPPLIER`, HTTP 403 |
| BIKE24 | `https://www.bike24.com/p2411182.html` — ORTLIEB Saddle-Bag | — | — | — | — | — | — | — | — | `BLOCKED_BY_SUPPLIER`, HTTP 403 |
| Bike-Discount | `https://www.bike-discount.de/en/shimano-105-br-r7170-flat-mount-brake-caliper-rear` | 105 BR-R7170 Flat-Mount Brake Caliper rear | Shimano | 1 / 2 | 20109139 | 4550170168650 | 15 | 0 | `IN_STOCK` | `PARTIAL`: variants unavailable |
| Bike-Discount | `https://www.bike-discount.de/en/continental-contact-47-622-e-25-wired` | Contact 47-622 E-25 Wired | Continental | 1 / 0 | 20146615 | 4019238761412 | 10 | 0 | `OUT_OF_STOCK` | `PARTIAL`: variants unavailable |
| Bike-Discount | `https://www.bike-discount.de/en/bike-discount-team-jersey-2026` | Team jersey 2026 \| 20167093 | null | 1 / 6 | 6046-S | null | 2 | 6 | `IN_STOCK` | `PARTIAL`: brand и GTIN unavailable |

Availability конкретных jersey variants получена из явного boolean поля embedded state: пять проверенных размеров были `IN_STOCK`, один — `OUT_OF_STOCK`. Для товаров без статического списка вариантов adapter возвращает пустой массив и warning.

BIKE24 показал Akamai anti-bot restriction. Bike-Discount также обслуживается через Cloudflare, но проверенные Node HTTPS requests прошли без challenge. JavaScript/browser rendering для доступных Bike-Discount полей не потребовался. Для BIKE24 browser мог бы отобразить страницу, но headless/browser fallback намеренно не добавлялся.

## Примеры ответов

Фактический BIKE24 error response:

```json
{
  "ok": false,
  "error": {
    "code": "BLOCKED_BY_SUPPLIER",
    "message": "The supplier did not allow this server-side request."
  }
}
```

Сокращённый фактический Bike-Discount success response; длинные arrays показаны частично:

```json
{
  "ok": true,
  "status": "PARTIAL",
  "product": {
    "supplier": "BIKE_DISCOUNT",
    "sourceUrl": "https://www.bike-discount.de/en/shimano-105-br-r7170-flat-mount-brake-caliper-rear",
    "title": "105 BR-R7170 Flat-Mount Brake Caliper rear",
    "brand": "Shimano",
    "primaryImageUrl": "https://www.bike-discount.de/media/8f/10/19/1705525165/shimano-105-br-r7170-flat-mount-bremssattel-hinten-ibrr7170rdrf.jpg?ts=1762583282",
    "imageUrls": ["three validated HTTP(S) image URLs"],
    "supplierSku": "20109139",
    "gtin": "4550170168650",
    "attributes": [
      { "name": "Use", "value": "Road" },
      { "name": "Model", "value": "BR-R7170-R" }
    ],
    "variants": [],
    "availability": "IN_STOCK",
    "importedAt": "2026-09-21T03:43:05.000Z",
    "warnings": [
      {
        "code": "VARIANTS_UNAVAILABLE",
        "message": "Product variants were not available in static HTML."
      }
    ],
    "fieldSources": {
      "title": "json-ld",
      "brand": "json-ld",
      "images": "json-ld",
      "supplierSku": "json-ld",
      "gtin": "json-ld",
      "attributes": "html",
      "availability": "json-ld"
    }
  }
}
```

## Эксплуатационные ограничения и fallback

HTML, CSS classes и embedded state магазинов не являются стабильным контрактом. Изменение markup может уменьшить полноту импорта или вызвать `PARSE_FAILED`; поэтому importer должен наблюдаться по status/warnings, а fixtures и selectors должны обновляться после подтверждённого изменения страницы.

Для MVP обязателен manual fallback: клиент сохраняет URL и quantity, а недостающие идентификационные данные уточняет менеджер. BIKE24 сейчас всегда требует такой fallback. Bike-Discount URL import пригоден как ускорение ввода, но результат всё равно не заменяет менеджерскую проверку и не является коммерческой истиной.

## Вывод spike

Текущий public-page URL import **жизнеспособен частично с manual fallback**: Bike-Discount даёт полезные идентификационные данные и варианты без browser rendering, но BIKE24 блокирует обычный server request. Поэтому importer можно использовать в первом `CustomerOrder` flow только как необязательное best-effort обогащение; URL + quantity и ручная проверка должны оставаться рабочим путём.
