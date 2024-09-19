// utils/errorHandler.ts

export class SessionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SessionError";
  }
}

export function handleSessionError(error: unknown): never {
  if (error instanceof SessionError) {
    console.error(`Session error: ${error.message}`);
    // ここでエラーログを保存したり、監視システムに通知したりできます
  } else {
    console.error("Unknown error occurred in session management:", error);
  }
  throw error;
}
