export type LogLevel = 'off' | 'error' | 'warn' | 'info' | 'debug';

export class Logger {
  private static _level: LogLevel = 'warn';

  static get logLevel(): LogLevel {
    return Logger._level;
  }

  static set logLevel(level: LogLevel) {
    Logger._level = level;
  }

  static setLevel(level: LogLevel): void {
    Logger._level = level;
  }

  static error(message: string | Error, ...args: any[]): void {
    if (Logger._level === 'off') return;

    if (message instanceof Error) {
      console.error('[ERROR]', message.message, message.stack, ...args);
    } else {
      console.error('[ERROR]', message, ...args);
    }
  }

  static warn(message: string, ...args: any[]): void {
    if (Logger._level === 'off') return;
    console.warn('[WARN]', message, ...args);
  }

  static log(message: string, ...args: any[]): void {
    if (Logger._level === 'off' || Logger._level === 'error') return;
    console.log('[INFO]', message, ...args);
  }

  static debug(message: string, ...args: any[]): void {
    if (Logger._level !== 'debug') return;
    console.debug('[DEBUG]', message, ...args);
  }
}
