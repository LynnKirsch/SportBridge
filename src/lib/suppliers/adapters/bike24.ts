import { fetchProductPage } from "../fetch-product-page";
import { parseSupplierProductPage } from "../parse-product-page";
import type { SupplierProductAdapter } from "../types";
import { supplierForHostname } from "../url-policy";

export const bike24Adapter: SupplierProductAdapter = {
  supplier: "BIKE24",

  canHandle(url) {
    return supplierForHostname(url.hostname) === this.supplier;
  },

  async importProduct(url) {
    const page = await fetchProductPage(url, this.supplier);
    const product = parseSupplierProductPage(page.html, page.finalUrl, {
      supplier: this.supplier,
      attributeSelectors: [
        "[class*='fact-sheet'] tr",
        "[class*='factsheet'] tr",
        "[data-testid*='fact'] tr",
      ],
      attributeListSelectors: [],
      gallerySelectors: [
        "[class*='product-gallery'] img",
        "[class*='image-gallery'] img",
        "[data-testid*='gallery'] img",
      ],
      variantSelectors: [
        "[class*='variant'] option",
        "[class*='size'] option",
        "[data-testid*='variant'] option",
      ],
      skuLabels: ["item code", "manufacturer item code", "article number"],
      gtinLabels: ["gtins", "gtin", "ean"],
    });

    return {
      ok: true,
      status: product.warnings.length === 0 ? "COMPLETE" : "PARTIAL",
      product,
    };
  },
};
