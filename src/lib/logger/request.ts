import { randomUUID } from "node:crypto";

import { logger, type AppLogger } from "@/lib/logger";

export const REQUEST_ID_HEADER = "x-request-id";

const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export type RequestLogContext = {
  logger: AppLogger;
  requestId: string;
};

export type LoggedRouteHandler = (
  request: Request,
  context: RequestLogContext,
) => Response | Promise<Response>;

export type RequestLoggingOptions = {
  route: string;
  trustIncomingRequestId?: boolean;
};

function resolveRequestId(
  request: Request,
  trustIncomingRequestId: boolean,
): string {
  if (trustIncomingRequestId) {
    const incomingRequestId = request.headers.get(REQUEST_ID_HEADER)?.trim();

    if (incomingRequestId && REQUEST_ID_PATTERN.test(incomingRequestId)) {
      return incomingRequestId;
    }
  }

  return randomUUID();
}

function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error("Non-Error value thrown");
}

export function withRequestLogging(
  handler: LoggedRouteHandler,
  options: RequestLoggingOptions,
) {
  return async function loggedRouteHandler(request: Request): Promise<Response> {
    const requestId = resolveRequestId(
      request,
      options.trustIncomingRequestId ?? false,
    );
    const requestLogger = logger.child({
      requestId,
      method: request.method,
      route: options.route,
    });
    const startedAt = performance.now();

    requestLogger.info({ event: "http.request.started" }, "Request started");

    try {
      const response = await handler(request, {
        logger: requestLogger,
        requestId,
      });
      const durationMs = Number((performance.now() - startedAt).toFixed(2));

      response.headers.set(REQUEST_ID_HEADER, requestId);
      requestLogger.info(
        {
          event: "http.request.completed",
          statusCode: response.status,
          durationMs,
        },
        "Request completed",
      );

      return response;
    } catch (error) {
      const durationMs = Number((performance.now() - startedAt).toFixed(2));

      requestLogger.error(
        {
          event: "http.request.failed",
          durationMs,
          err: normalizeError(error),
        },
        "Request failed",
      );

      throw error;
    }
  };
}
