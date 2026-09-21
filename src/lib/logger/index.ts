import pino, { type Logger as PinoLogger } from "pino";

const SERVICE_NAME = "sportbridge";
const DEFAULT_LOG_LEVEL = "info";
const LOG_LEVELS = new Set([
  "fatal",
  "error",
  "warn",
  "info",
  "debug",
  "trace",
  "silent",
]);

export type LogEvent = `${string}.${string}`;

export type LogContext = {
  event: LogEvent;
  requestId?: string;
  method?: string;
  route?: string;
  statusCode?: number;
  durationMs?: number;
  orderId?: string;
  quoteId?: string;
  paymentId?: string;
  supplierPurchaseId?: string;
  shipmentId?: string;
  userId?: string;
  err?: Error;
  [key: string]: unknown;
};

export type LoggerBindings = {
  requestId?: string;
  method?: string;
  route?: string;
  orderId?: string;
  quoteId?: string;
  paymentId?: string;
  supplierPurchaseId?: string;
  shipmentId?: string;
  userId?: string;
  [key: string]: unknown;
};

export interface AppLogger {
  debug(context: LogContext, message: string): void;
  info(context: LogContext, message: string): void;
  warn(context: LogContext, message: string): void;
  error(context: LogContext, message: string): void;
  child(bindings: LoggerBindings): AppLogger;
}

function resolveLogLevel(value: string | undefined): string {
  const normalized = value?.trim().toLowerCase();

  return normalized && LOG_LEVELS.has(normalized)
    ? normalized
    : DEFAULT_LOG_LEVEL;
}

function wrapLogger(instance: PinoLogger): AppLogger {
  return {
    debug(context, message) {
      instance.debug(context, message);
    },
    info(context, message) {
      instance.info(context, message);
    },
    warn(context, message) {
      instance.warn(context, message);
    },
    error(context, message) {
      instance.error(context, message);
    },
    child(bindings) {
      return wrapLogger(instance.child(bindings));
    },
  };
}

const pinoLogger = pino({
  level: resolveLogLevel(process.env.LOG_LEVEL),
  base: {
    service: SERVICE_NAME,
    environment: process.env.NODE_ENV ?? "development",
  },
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  serializers: {
    err(error: Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    },
  },
  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
  redact: {
    censor: "[REDACTED]",
    paths: [
      "password",
      "token",
      "accessToken",
      "refreshToken",
      "authorization",
      "cookie",
      "cookies",
      "session",
      "sessionId",
      "apiKey",
      "secret",
      "DATABASE_URL",
      "databaseUrl",
      "cardNumber",
      "cvv",
      "bankAccount",
      "iban",
      "paymentProof",
      "email",
      "phone",
      "address",
      "headers.authorization",
      "headers.cookie",
      "request.headers.authorization",
      "request.headers.cookie",
      "req.headers.authorization",
      "req.headers.cookie",
    ],
  },
});

export const logger = wrapLogger(pinoLogger);
