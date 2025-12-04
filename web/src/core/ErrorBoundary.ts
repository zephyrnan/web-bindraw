export class ErrorBoundary {
  private static instance: ErrorBoundary;
  private errorHandlers: Map<string, (error: Error) => void> = new Map();

  static getInstance(): ErrorBoundary {
    if (!ErrorBoundary.instance) {
      ErrorBoundary.instance = new ErrorBoundary();
    }
    return ErrorBoundary.instance;
  }

  handleError(context: string, error: Error): void {
    console.error(`[${context}] Error:`, error);
    
    const handler = this.errorHandlers.get(context);
    if (handler) {
      try {
        handler(error);
      } catch (handlerError) {
        console.error(`[${context}] Error handler failed:`, handlerError);
      }
    }
  }

  registerHandler(context: string, handler: (error: Error) => void): void {
    this.errorHandlers.set(context, handler);
  }

  unregisterHandler(context: string): void {
    this.errorHandlers.delete(context);
  }

  async safeExecute<T>(
    context: string,
    fn: () => Promise<T> | T,
    fallback?: T
  ): Promise<T | undefined> {
    try {
      return await fn();
    } catch (error) {
      this.handleError(context, error as Error);
      return fallback;
    }
  }
}