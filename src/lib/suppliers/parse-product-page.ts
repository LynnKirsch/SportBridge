import { load, type CheerioAPI } from "cheerio";

import { ProductImportError } from "./errors";
import type {
  NormalizedProduct,
  NormalizedProductField,
  ProductAttribute,
  ProductAvailability,
  ProductDataSource,
  ProductImportWarning,
  ProductVariant,
  SupplierCode,
} from "./types";

type JsonObject = Record<string, unknown>;

type ParsedFields = {
  title?: string;
  brand?: string;
  imageUrls: string[];
  supplierSku?: string;
  gtin?: string;
  attributes: ProductAttribute[];
  variants: ProductVariant[];
  availability?: ProductAvailability;
  fieldSources: Partial<Record<NormalizedProductField, ProductDataSource>>;
};

export type SupplierParserOptions = {
  supplier: SupplierCode;
  attributeSelectors: string[];
  attributeListSelectors: string[];
  gallerySelectors: string[];
  variantSelectors: string[];
  embeddedVariantDataSelector?: string;
  skuLabels: string[];
  gtinLabels: string[];
};

function asObject(value: unknown): JsonObject | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonObject)
    : null;
}

function cleanText(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned || undefined;
}

function firstText(...values: unknown[]): string | undefined {
  for (const value of values) {
    const text = cleanText(value);
    if (text) {
      return text;
    }
  }

  return undefined;
}

function jsonLdTypes(node: JsonObject): string[] {
  const type = node["@type"];
  return Array.isArray(type)
    ? type.filter((value): value is string => typeof value === "string")
    : typeof type === "string"
      ? [type]
      : [];
}

function flattenJsonLd(value: unknown): JsonObject[] {
  if (Array.isArray(value)) {
    return value.flatMap(flattenJsonLd);
  }

  const object = asObject(value);
  if (!object) {
    return [];
  }

  const graph = object["@graph"];
  return graph ? [object, ...flattenJsonLd(graph)] : [object];
}

function parseJsonLd($: CheerioAPI): JsonObject[] {
  const nodes: JsonObject[] = [];

  $("script[type='application/ld+json']").each((_, element) => {
    try {
      nodes.push(...flattenJsonLd(JSON.parse($(element).text())));
    } catch {
      // Invalid third-party structured data is ignored in favor of other sources.
    }
  });

  return nodes;
}

function toAbsoluteHttpUrl(value: unknown, sourceUrl: URL): string | undefined {
  const raw = cleanText(value);
  if (!raw) {
    return undefined;
  }

  try {
    const url = new URL(raw, sourceUrl);
    if (
      (url.protocol !== "https:" && url.protocol !== "http:") ||
      url.username ||
      url.password
    ) {
      return undefined;
    }

    url.hash = "";
    return url.toString();
  } catch {
    return undefined;
  }
}

function imageValues(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value.flatMap(imageValues);
  }

  const object = asObject(value);
  if (object) {
    return [object.contentUrl, object.url].filter(Boolean);
  }

  return [value];
}

function addImages(target: string[], values: unknown[], sourceUrl: URL): void {
  for (const value of values) {
    const imageUrl = toAbsoluteHttpUrl(value, sourceUrl);
    if (imageUrl && !target.includes(imageUrl)) {
      target.push(imageUrl);
    }
  }
}

function parseAvailability(value: unknown): ProductAvailability | undefined {
  const normalized = cleanText(value)?.toLowerCase();
  if (!normalized) {
    return undefined;
  }

  if (normalized.includes("outofstock") || normalized.includes("out of stock")) {
    return "OUT_OF_STOCK";
  }
  if (normalized.includes("instock") || normalized.includes("in stock")) {
    return "IN_STOCK";
  }
  if (normalized.includes("preorder") || normalized.includes("pre-order")) {
    return "PREORDER";
  }
  if (normalized.includes("backorder") || normalized.includes("back-order")) {
    return "BACKORDER";
  }
  if (normalized.includes("discontinued")) {
    return "DISCONTINUED";
  }

  return undefined;
}

function extractBrand(value: unknown): string | undefined {
  const object = asObject(value);
  return firstText(object?.name, value);
}

function extractGtin(product: JsonObject): string | undefined {
  return firstText(
    product.gtin,
    product.gtin14,
    product.gtin13,
    product.gtin12,
    product.gtin8,
    product.ean,
  );
}

function propertyValue(value: unknown): ProductAttribute | null {
  const object = asObject(value);
  const name = firstText(object?.name, object?.propertyID);
  const property = firstText(object?.value);
  return name && property ? { name, value: property } : null;
}

function variantFromJsonLd(value: unknown): ProductVariant | null {
  const object = asObject(value);
  if (!object) {
    return null;
  }

  const offers = Array.isArray(object.offers) ? object.offers[0] : object.offers;
  const offer = asObject(offers);
  const variant: ProductVariant = {
    id: firstText(object.productID, object["@id"]),
    sku: firstText(object.sku, object.mpn, offer?.sku),
    name: firstText(object.name),
    size: firstText(object.size),
    color: firstText(object.color),
    availability: parseAvailability(offer?.availability ?? object.availability),
  };

  return Object.values(variant).some(Boolean) ? variant : null;
}

function extractStructuredData(
  nodes: JsonObject[],
  sourceUrl: URL,
): ParsedFields {
  const product = nodes.find((node) => jsonLdTypes(node).includes("Product"));
  const fields: ParsedFields = {
    imageUrls: [],
    attributes: [],
    variants: [],
    fieldSources: {},
  };

  if (!product) {
    return fields;
  }

  fields.title = firstText(product.name);
  fields.brand = extractBrand(product.brand ?? product.manufacturer);
  fields.supplierSku = firstText(product.sku, product.mpn, product.productID);
  fields.gtin = extractGtin(product);
  addImages(fields.imageUrls, imageValues(product.image), sourceUrl);

  const additionalProperties = Array.isArray(product.additionalProperty)
    ? product.additionalProperty
    : [product.additionalProperty];
  fields.attributes = additionalProperties
    .map(propertyValue)
    .filter((value): value is ProductAttribute => value !== null);

  const variants = Array.isArray(product.hasVariant)
    ? product.hasVariant
    : [product.hasVariant];
  fields.variants = variants
    .map(variantFromJsonLd)
    .filter((value): value is ProductVariant => value !== null);

  const offers = Array.isArray(product.offers) ? product.offers[0] : product.offers;
  fields.availability = parseAvailability(asObject(offers)?.availability);

  for (const [field, present] of [
    ["title", fields.title],
    ["brand", fields.brand],
    ["images", fields.imageUrls.length],
    ["supplierSku", fields.supplierSku],
    ["gtin", fields.gtin],
    ["attributes", fields.attributes.length],
    ["variants", fields.variants.length],
    ["availability", fields.availability],
  ] as [NormalizedProductField, unknown][]) {
    if (present) {
      fields.fieldSources[field] = "json-ld";
    }
  }

  return fields;
}

function extractOpenGraph(
  $: CheerioAPI,
  sourceUrl: URL,
  fields: ParsedFields,
): void {
  if (!fields.title) {
    fields.title = firstText(
      $("meta[property='og:title']").attr("content"),
      $("meta[name='twitter:title']").attr("content"),
    );
    if (fields.title) fields.fieldSources.title = "open-graph";
  }

  const before = fields.imageUrls.length;
  $("meta[property='og:image'], meta[property='og:image:url'], meta[name='twitter:image']")
    .each((_, element) => {
      addImages(fields.imageUrls, [$(element).attr("content")], sourceUrl);
    });
  if (fields.imageUrls.length > before && !fields.fieldSources.images) {
    fields.fieldSources.images = "open-graph";
  }
}

function extractAttributesFromDom(
  $: CheerioAPI,
  rowSelectors: string[],
  listSelectors: string[],
): ProductAttribute[] {
  const attributes: ProductAttribute[] = [];
  const add = (nameValue: unknown, valueValue: unknown) => {
    const name = cleanText(nameValue)?.replace(/:\s*$/, "");
    const value = cleanText(valueValue);
    if (
      name &&
      value &&
      name.length <= 120 &&
      value.length <= 500 &&
      !attributes.some((attribute) => attribute.name === name && attribute.value === value)
    ) {
      attributes.push({ name, value });
    }
  };

  for (const selector of rowSelectors) {
    $(selector).each((_, element) => {
      const cells = $(element).find(":scope > th, :scope > td");
      if (cells.length >= 2) {
        add($(cells[0]).text(), $(cells[1]).text());
      }
    });
  }

  for (const selector of listSelectors) {
    $(selector).each((_, element) => {
      const text = cleanText($(element).text());
      const separator = text?.indexOf(":") ?? -1;

      if (text && separator > 0) {
        add(text.slice(0, separator), text.slice(separator + 1));
      }
    });
  }

  return attributes.slice(0, 100);
}

function findAttribute(
  attributes: ProductAttribute[],
  labels: string[],
): string | undefined {
  const normalizedLabels = labels.map((label) => label.toLowerCase());
  return attributes.find((attribute) =>
    normalizedLabels.includes(attribute.name.toLowerCase()),
  )?.value;
}

function extractGalleryImages(
  $: CheerioAPI,
  selectors: string[],
  sourceUrl: URL,
): string[] {
  const images: string[] = [];

  for (const selector of selectors) {
    $(selector).each((_, element) => {
      const values = [
        $(element).attr("data-src"),
        $(element).attr("data-zoom-image"),
        $(element).attr("src"),
      ];
      const srcset = $(element).attr("srcset")?.split(",").map((entry) => entry.trim().split(/\s+/)[0]);
      addImages(images, [...values, ...(srcset ?? [])], sourceUrl);
    });
  }

  return images;
}

function extractDomVariants($: CheerioAPI, selectors: string[]): ProductVariant[] {
  const variants: ProductVariant[] = [];

  for (const selector of selectors) {
    $(selector).each((_, element) => {
      const text = cleanText($(element).text());
      const value = cleanText($(element).attr("value"));
      const label = cleanText($(element).next("label").text());
      const labelTitle = cleanText($(element).next("label").attr("title"));
      const candidate = firstText(text, label, labelTitle);
      const name = candidate && !/^(choose|select|please)/i.test(candidate) ? candidate : undefined;

      if (name && !variants.some((variant) => variant.name === name)) {
        variants.push({
          id: cleanText($(element).attr("data-option-id")) ?? value,
          sku: cleanText($(element).attr("data-product-number")),
          name,
        });
      }
    });
  }

  return variants.slice(0, 100);
}

function extractEmbeddedVariants(
  $: CheerioAPI,
  selector: string | undefined,
): ProductVariant[] {
  if (!selector) {
    return [];
  }

  const raw = $(selector).first().attr("data-nele-variant-data");
  if (!raw) {
    return [];
  }

  try {
    const data = asObject(JSON.parse(raw));
    const siblings = Array.isArray(data?.siblings) ? data.siblings : [];

    return siblings.flatMap((value): ProductVariant[] => {
      const variant = asObject(value);
      const id = firstText(variant?.id);
      const name = firstText(variant?.variantName);

      if (!variant || !id || !name) {
        return [];
      }

      return [
        {
          id,
          sku: firstText(variant.manufacturerNumber),
          name,
          size: name,
          availability:
            variant.available === true
              ? "IN_STOCK"
              : variant.available === false
                ? "OUT_OF_STOCK"
                : undefined,
        },
      ];
    });
  } catch {
    return [];
  }
}

function warning(code: ProductImportWarning["code"], message: string): ProductImportWarning {
  return { code, message };
}

export function parseSupplierProductPage(
  html: string,
  sourceUrl: URL,
  options: SupplierParserOptions,
): NormalizedProduct {
  const $ = load(html);
  const fields = extractStructuredData(parseJsonLd($), sourceUrl);
  extractOpenGraph($, sourceUrl, fields);

  if (!fields.title) {
    fields.title = firstText($("h1").first().text(), $("title").text());
    if (fields.title) fields.fieldSources.title = "html";
  }

  const domAttributes = extractAttributesFromDom(
    $,
    options.attributeSelectors,
    options.attributeListSelectors,
  );
  if (fields.attributes.length === 0 && domAttributes.length > 0) {
    fields.attributes = domAttributes;
    fields.fieldSources.attributes = "html";
  } else {
    for (const attribute of domAttributes) {
      if (!fields.attributes.some((existing) => existing.name === attribute.name)) {
        fields.attributes.push(attribute);
      }
    }
  }

  if (!fields.brand) {
    fields.brand = findAttribute(fields.attributes, ["manufacturer", "brand", "hersteller"]);
    if (fields.brand) fields.fieldSources.brand = "html";
  }
  if (!fields.supplierSku) {
    fields.supplierSku = findAttribute(fields.attributes, options.skuLabels);
    if (fields.supplierSku) fields.fieldSources.supplierSku = "html";
  }
  if (!fields.gtin) {
    fields.gtin = findAttribute(fields.attributes, options.gtinLabels)?.split(/[,;\s]+/)[0];
    if (fields.gtin) fields.fieldSources.gtin = "html";
  }

  const galleryImages = extractGalleryImages($, options.gallerySelectors, sourceUrl);
  const previousImageCount = fields.imageUrls.length;
  addImages(fields.imageUrls, galleryImages, sourceUrl);
  if (fields.imageUrls.length > previousImageCount && !fields.fieldSources.images) {
    fields.fieldSources.images = "html";
  }

  if (fields.variants.length === 0) {
    fields.variants = extractEmbeddedVariants($, options.embeddedVariantDataSelector);
    if (fields.variants.length > 0) fields.fieldSources.variants = "embedded-json";
  }

  if (fields.variants.length === 0) {
    fields.variants = extractDomVariants($, options.variantSelectors);
    if (fields.variants.length > 0) fields.fieldSources.variants = "html";
  }

  if (!fields.availability) {
    fields.availability = parseAvailability(
      $("[itemprop='availability']").first().attr("href") ??
        $("[itemprop='availability']").first().attr("content"),
    );
    if (fields.availability) fields.fieldSources.availability = "html";
  }

  if (!fields.availability && fields.variants.length > 0) {
    const variantAvailability = fields.variants.map((variant) => variant.availability);
    if (variantAvailability.every((availability) => availability === "OUT_OF_STOCK")) {
      fields.availability = "OUT_OF_STOCK";
      fields.fieldSources.availability = "embedded-json";
    } else if (variantAvailability.some((availability) => availability === "IN_STOCK")) {
      fields.availability = "IN_STOCK";
      fields.fieldSources.availability = "embedded-json";
    }
  }

  if (!fields.title || fields.imageUrls.length === 0) {
    throw new ProductImportError(
      "PARSE_FAILED",
      "The page did not contain the minimum required title and product image.",
    );
  }

  const warnings: ProductImportWarning[] = [];
  if (!fields.brand) warnings.push(warning("BRAND_UNAVAILABLE", "Brand was not found."));
  if (!fields.supplierSku) warnings.push(warning("SKU_UNAVAILABLE", "Supplier SKU was not found."));
  if (!fields.gtin) warnings.push(warning("GTIN_UNAVAILABLE", "GTIN/EAN was not found."));
  if (fields.attributes.length === 0) {
    warnings.push(warning("ATTRIBUTES_UNAVAILABLE", "Product attributes were not found."));
  }
  if (fields.variants.length === 0) {
    warnings.push(warning("VARIANTS_UNAVAILABLE", "Product variants were not available in static HTML."));
  } else if (fields.variants.some((variant) => !variant.availability)) {
    warnings.push(
      warning(
        "VARIANT_AVAILABILITY_UNCONFIRMED",
        "Variant availability could not be confirmed from explicit structured data.",
      ),
    );
  }
  if (!fields.availability) {
    warnings.push(
      warning(
        "AVAILABILITY_UNCONFIRMED",
        "Product availability could not be confirmed unambiguously.",
      ),
    );
  }

  return {
    supplier: options.supplier,
    sourceUrl: sourceUrl.toString(),
    title: fields.title,
    brand: fields.brand ?? null,
    primaryImageUrl: fields.imageUrls[0],
    imageUrls: fields.imageUrls,
    supplierSku: fields.supplierSku ?? null,
    gtin: fields.gtin ?? null,
    attributes: fields.attributes,
    variants: fields.variants,
    availability: fields.availability ?? null,
    importedAt: new Date().toISOString(),
    warnings,
    fieldSources: fields.fieldSources,
  };
}
