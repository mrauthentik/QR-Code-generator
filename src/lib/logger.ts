/**
 * Structured JSON Logger with context and request IDs
 */

export interface LogContext {
  requestId?: string;
  slug?: string;
  qrId?: string;
  userId?: string;
  ip?: string;
  [key: string]: unknown;
}

export const logger = {
  info(message: string, context?: LogContext) {
    console.log(
      JSON.stringify({
        level: "info",
        timestamp: new Date().toISOString(),
        message,
        ...context,
      })
    );
  },

  warn(message: string, context?: LogContext) {
    console.warn(
      JSON.stringify({
        level: "warn",
        timestamp: new Date().toISOString(),
        message,
        ...context,
      })
    );
  },

  error(message: string, error?: unknown, context?: LogContext) {
    console.error(
      JSON.stringify({
        level: "error",
        timestamp: new Date().toISOString(),
        message,
        error:
          error instanceof Error
            ? { name: error.name, message: error.message, stack: error.stack }
            : error,
        ...context,
      })
    );
  },

  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV !== "production") {
      console.debug(
        JSON.stringify({
          level: "debug",
          timestamp: new Date().toISOString(),
          message,
          ...context,
        })
      );
    }
  },
};
