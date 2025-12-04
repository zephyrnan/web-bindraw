/**
 * 日志工具
 * 统一的日志输出，支持不同级别和环境
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private isDevelopment = import.meta.env.NODE_ENV === 'development';
  private prefix = '[App]';

  setPrefix(prefix: string): void {
    this.prefix = prefix;
  }

  private log(level: LogLevel, ...args: unknown[]): void {
    // 生产环境只输出 warn 和 error
    if (!this.isDevelopment && (level === 'debug' || level === 'info')) {
      return;
    }

    const timestamp = new Date().toISOString();
    const prefix = `${this.prefix} [${level.toUpperCase()}] ${timestamp}`;

    switch (level) {
      case 'debug':
        console.debug(prefix, ...args);
        break;
      case 'info':
        console.info(prefix, ...args);
        break;
      case 'warn':
        console.warn(prefix, ...args);
        break;
      case 'error':
        console.error(prefix, ...args);
        break;
    }
  }

  debug(...args: unknown[]): void {
    this.log('debug', ...args);
  }

  info(...args: unknown[]): void {
    this.log('info', ...args);
  }

  warn(...args: unknown[]): void {
    this.log('warn', ...args);
  }

  error(...args: unknown[]): void {
    this.log('error', ...args);
  }
}

export const logger = new Logger();

// 创建特定模块的 logger
export function createLogger(moduleName: string): Logger {
  const moduleLogger = new Logger();
  moduleLogger.setPrefix(`[${moduleName}]`);
  return moduleLogger;
}
