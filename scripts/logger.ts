// logger.ts
import * as Sentry from "@sentry/nextjs";

class Logger {
  log(...args: any[]) {
    const message = args
      .map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : arg))
      .join(" ");
    Sentry.captureMessage(message, "info");
    console.log(...args);
  }

  error(...args: any[]) {
    const message = args
      .map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : arg))
      .join(" ");
    const error = new Error(message);
    Sentry.captureException(error);
    console.error(...args);
  }
}

export const logger = new Logger();
