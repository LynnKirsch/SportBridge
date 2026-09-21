import { request as requestHttp } from "node:http";
import { request as requestHttps } from "node:https";
import type { IncomingMessage } from "node:http";

import { ProductImportError } from "./errors";
import type { SupplierCode } from "./types";
import {
  parseSupplierUrl,
  resolvePublicAddresses,
  type PublicAddress,
} from "./url-policy";

const MAX_REDIRECTS = 3;
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const USER_AGENT = "SportBridge product-import-spike/0.1";

export type FetchedProductPage = {
  html: string;
  finalUrl: URL;
};

function isRedirectStatus(status: number): boolean {
  return [301, 302, 303, 307, 308].includes(status);
}

async function readLimitedText(response: IncomingMessage): Promise<string> {
  const contentLength = Number(response.headers["content-length"]);

  if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BYTES) {
    throw new ProductImportError(
      "RESPONSE_TOO_LARGE",
      "The supplier response exceeded the 2 MiB limit.",
    );
  }

  const chunks: Buffer[] = [];
  let receivedBytes = 0;

  return await new Promise<string>((resolve, reject) => {
    response.on("data", (value: Buffer) => {
      receivedBytes += value.byteLength;

      if (receivedBytes > MAX_RESPONSE_BYTES) {
        response.destroy();
        reject(
          new ProductImportError(
            "RESPONSE_TOO_LARGE",
            "The supplier response exceeded the 2 MiB limit.",
          ),
        );
        return;
      }

      chunks.push(value);
    });
    response.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    response.on("error", () =>
      reject(
        new ProductImportError(
          "FETCH_FAILED",
          "The supplier response stream ended unexpectedly.",
        ),
      ),
    );
  });
}

async function requestPinnedUrl(
  url: URL,
  publicAddress: PublicAddress,
): Promise<IncomingMessage> {
  return await new Promise<IncomingMessage>((resolve, reject) => {
    const requestOptions = {
      method: "GET",
      hostname: publicAddress.address,
      family: publicAddress.family,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: `${url.pathname}${url.search}`,
      headers: {
        accept: "text/html,application/xhtml+xml;q=0.9",
        host: url.host,
        "user-agent": USER_AGENT,
      },
    };
    const outgoingRequest =
      url.protocol === "https:"
        ? requestHttps(
            {
              ...requestOptions,
              servername: url.hostname,
            },
            resolve,
          )
        : requestHttp(requestOptions, resolve);

    outgoingRequest.setTimeout(REQUEST_TIMEOUT_MS, () => {
      outgoingRequest.destroy(new Error("Supplier request timed out."));
    });
    outgoingRequest.on("error", () => {
      reject(
        new ProductImportError(
          "FETCH_FAILED",
          "The supplier product page could not be fetched.",
        ),
      );
    });
    outgoingRequest.end();
  });
}

export async function fetchProductPage(
  initialUrl: URL,
  expectedSupplier: SupplierCode,
): Promise<FetchedProductPage> {
  let currentUrl = new URL(initialUrl);

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const resolved = parseSupplierUrl(currentUrl.toString());

    if (resolved.supplier !== expectedSupplier) {
      throw new ProductImportError(
        "UNSUPPORTED_SUPPLIER",
        "A redirect crossed into a different supplier hostname.",
      );
    }

    currentUrl = resolved.url;
    const publicAddresses = await resolvePublicAddresses(currentUrl.hostname);

    let response: IncomingMessage;
    try {
      response = await requestPinnedUrl(currentUrl, publicAddresses[0]);
    } catch (error) {
      if (error instanceof ProductImportError) {
        throw error;
      }

      throw new ProductImportError("FETCH_FAILED", "The supplier product page could not be fetched.");
    }

    const status = response.statusCode ?? 0;

    if (isRedirectStatus(status)) {
      response.resume();
      if (redirectCount === MAX_REDIRECTS) {
        throw new ProductImportError(
          "FETCH_FAILED",
          "The supplier response exceeded the redirect limit.",
        );
      }

      const location = response.headers.location;
      if (!location) {
        throw new ProductImportError(
          "FETCH_FAILED",
          "The supplier returned a redirect without a destination.",
        );
      }

      currentUrl = new URL(location, currentUrl);
      continue;
    }

    if (status === 404 || status === 410) {
      response.resume();
      throw new ProductImportError("PAGE_NOT_FOUND", "The product page was not found.");
    }

    if ([401, 403, 429, 503].includes(status)) {
      response.resume();
      throw new ProductImportError(
        "BLOCKED_BY_SUPPLIER",
        "The supplier did not allow this server-side request.",
      );
    }

    if (status < 200 || status >= 300) {
      response.resume();
      throw new ProductImportError(
        "FETCH_FAILED",
        `The supplier returned HTTP ${status}.`,
      );
    }

    const contentType = response.headers["content-type"]?.toLowerCase() ?? "";
    if (
      !contentType.startsWith("text/html") &&
      !contentType.startsWith("application/xhtml+xml")
    ) {
      throw new ProductImportError(
        "UNSUPPORTED_CONTENT_TYPE",
        "The supplier response was not an HTML document.",
      );
    }

    return {
      html: await readLimitedText(response),
      finalUrl: currentUrl,
    };
  }

  throw new ProductImportError("FETCH_FAILED", "The product page could not be fetched.");
}
