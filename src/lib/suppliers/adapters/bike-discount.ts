import { fetchProductPage } from "../fetch-product-page";
import { parseSupplierProductPage } from "../parse-product-page";
import type { SupplierProductAdapter } from "../types";
import { supplierForHostname } from "../url-policy";

export const bikeDiscountAdapter: SupplierProductAdapter = {
  supplier: "BIKE_DISCOUNT",

  canHandle(url) {
    return supplierForHostname(url.hostname) === this.supplier;
  },

  async importProduct(url) {
    const page = await fetchProductPage(url, this.supplier);
    const product = parseSupplierProductPage(page.html, page.finalUrl, {
      supplier: this.supplier,
      attributeSelectors: [],
      attributeListSelectors: [
        ".product-detail-description-text li",
        ".nele-product-details-facts li",
      ],
      gallerySelectors: [
        ".product-detail-media img",
        ".gallery-slider img",
        "[class*='product-detail'] [class*='gallery'] img",
      ],
      variantSelectors: [
        ".product-detail-configurator-option-input",
        ".product-detail-configurator option",
        "[class*='variant'] option",
      ],
      embeddedVariantDataSelector: "[data-nele-variant-data]",
      skuLabels: ["manufacturer number", "item no", "article number"],
      gtinLabels: ["ean", "gtin", "upc"],
    });

    return {
      ok: true,
      status: product.warnings.length === 0 ? "COMPLETE" : "PARTIAL",
      product,
    };
  },
};
