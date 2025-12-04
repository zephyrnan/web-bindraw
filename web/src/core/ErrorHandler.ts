/**
 * 全局错误处理器
 * 单例模式，统一处理应用中的错误
 */

export class ErrorHandler {
  private static instance: ErrorHandler;

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!this.instance) {
      this.instance = new ErrorHandler();
    }
    return this.instance;
  }

  /**
   * 处理错误
   */
  handle(error: Error, context: string): void {
    console.error(`[${context}]`, error);
    
    // 可以在这里添加错误上报逻辑
    // 例如：发送到错误监控服务
    if (import.meta.env.NODE_ENV === 'production') {
      // this.reportToService(error, context);
    }
  }

  /**
   * 处理渲染错误
   */
  handleRenderError(error: Error): void {
    this.handle(error, 'Render');
  }

  /**
   * 处理网络错误
   */
  handleNetworkError(error: Error): void {
    this.handle(error, 'Network');
  }

  /**
   * 处理命令执行错误
   */
  handleCommandError(error: Error): void {
    this.handle(error, 'Command');
  }
}
