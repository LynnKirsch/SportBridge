import { isIP } from "node:net";
import { lookup } from "node:dns/promises";

import { ProductImportError } from "./errors";
import type { SupplierCode } from "./types";

const SUPPLIER_HOSTNAMES: Record<SupplierCode, ReadonlySet<string>> = {
  BIKE24: new Set(["bike24.com", "www.bike24.com"]),
  BIKE_DISCOUNT: new Set(["bike-discount.de", "www.bike-discount.de"]),
};

export function supplierForHostname(hostname: string): SupplierCode | null {
  const normalizedHostname = hostname.toLowerCase().replace(/\.$/, "");

  for (const [supplier, hostnames] of Object.entries(SUPPLIER_HOSTNAMES) as [
    SupplierCode,
    ReadonlySet<string>,
  ][]) {
    if (hostnames.has(normalizedHostname)) {
      return supplier;
    }
  }

  return null;
}

export function parseSupplierUrl(rawUrl: string): {
  supplier: SupplierCode;
  url: URL;
} {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    throw new ProductImportError("INVALID_URL", "A valid absolute URL is required.");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new ProductImportError(
      "INVALID_URL",
      "Only HTTP and HTTPS product URLs are supported.",
    );
  }

  if (url.username || url.password) {
    throw new ProductImportError(
      "INVALID_URL",
      "Credentials are not allowed in product URLs.",
    );
  }

  if (
    (url.protocol === "https:" && url.port && url.port !== "443") ||
    (url.protocol === "http:" && url.port && url.port !== "80")
  ) {
    throw new ProductImportError(
      "INVALID_URL",
      "Only standard HTTP and HTTPS ports are supported.",
    );
  }

  const supplier = supplierForHostname(url.hostname);

  if (!supplier) {
    throw new ProductImportError(
      "UNSUPPORTED_SUPPLIER",
      "The URL hostname is not a supported supplier.",
    );
  }

  url.hash = "";

  return { supplier, url };
}

function isBlockedIpv4(address: string): boolean {
  const octets = address.split(".").map(Number);

  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet))) {
    return true;
  }

  const [a, b] = octets;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && octets[2] === 2) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && octets[2] === 100) ||
    (a === 203 && b === 0 && octets[2] === 113) ||
    a >= 224
  );
}

function isBlockedIpv6(address: string): boolean {
  const normalized = address.toLowerCase().split("%")[0];

  if (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[89ab]/.test(normalized) ||
    normalized.startsWith("ff") ||
    normalized.startsWith("2001:db8:")
  ) {
    return true;
  }

  const mappedIpv4 = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  return mappedIpv4 ? isBlockedIpv4(mappedIpv4) : false;
}

function isBlockedAddress(address: string): boolean {
  const family = isIP(address);

  if (family === 4) {
    return isBlockedIpv4(address);
  }

  if (family === 6) {
    return isBlockedIpv6(address);
  }

  return true;
}

export type PublicAddress = {
  address: string;
  family: 4 | 6;
};

export async function resolvePublicAddresses(
  hostname: string,
): Promise<PublicAddress[]> {
  let addresses: { address: string; family: number }[];

  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new ProductImportError(
      "FETCH_FAILED",
      "The supplier hostname could not be resolved.",
    );
  }

  if (addresses.length === 0 || addresses.some(({ address }) => isBlockedAddress(address))) {
    throw new ProductImportError(
      "INVALID_URL",
      "The supplier hostname resolved to a non-public network address.",
    );
  }

  return addresses
    .map(({ address, family }) => ({
      address,
      family: family === 6 ? (6 as const) : (4 as const),
    }))
    .sort((left, right) => left.family - right.family);
}

export function safeUrlForLogs(url: URL): string {
  return `${url.hostname.toLowerCase()}${url.pathname}`;
}
