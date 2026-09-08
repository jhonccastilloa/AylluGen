class Logger {
  private isDev = __DEV__;

  debug(...args: unknown[]) {
    if (this.isDev) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [DEBUG]`, ...args);
    }
  }

  info(...args: unknown[]) {
    if (this.isDev) {
      const timestamp = new Date().toISOString();
      console.info(`[${timestamp}] [INFO]`, ...args);
    }
  }

  warn(...args: unknown[]) {
    if (this.isDev) {
      const timestamp = new Date().toISOString();
      console.warn(`[${timestamp}] [WARN]`, ...args);
    }
  }

  error(...args: unknown[]) {
    if (this.isDev) {
      const timestamp = new Date().toISOString();
      console.error(`[${timestamp}] [ERROR]`, ...args);
    }
  }
}

const logger = new Logger();

export default logger;
