import type { LogLevel } from './logger.constants';
import type { LogScope } from './logger.scope';

const emptyStr = '';

const enum OrderedLevel {
  Off = 0,
  Error = 1,
  Warn = 2,
  Info = 3,
  Debug = 4,
}

export interface LogChannelProvider {
  readonly name: string;
  createChannel(name: string): LogChannel;
  toLoggable?(o: unknown): string | undefined;
}

export interface LogChannel {
  readonly name: string;
  appendLine(value: string): void;
  dispose?(): void;
  show?(preserveFocus?: boolean): void;
}

export const Logger = new (class Logger {
  private output: LogChannel | undefined;
  private provider: LogChannelProvider | undefined;

  configure(provider: LogChannelProvider, logLevel: LogLevel, debugging: boolean = false) {
    this.provider = provider;

    this._isDebugging = debugging;
    this.logLevel = logLevel;
  }

  enabled(level: LogLevel): boolean {
    return this.level >= toOrderedLevel(level);
  }

  private _isDebugging = false;
  get isDebugging() {
    return this._isDebugging;
  }

  private level: OrderedLevel = OrderedLevel.Off;
  private _logLevel: LogLevel = 'off';
  get logLevel(): LogLevel {
    return this._logLevel;
  }
  set logLevel(value: LogLevel) {
    this._logLevel = value;
    this.level = toOrderedLevel(this._logLevel);

    if (value === 'off') {
      this.output?.dispose?.();
      this.output = undefined;
    } else {
      this.output = this.output ?? this.provider!.createChannel(this.provider!.name);
    }
  }

  get timestamp(): string {
    return `[${new Date().toISOString().replace(/T/, ' ').slice(0, -1)}]`;
  }

  debug(message: string, ...params: any[]): void;
  debug(scope: LogScope | undefined, message: string, ...params: any[]): void;
  debug(scopeOrMessage: LogScope | string | undefined, ...params: any[]): void {
    if (this.level < OrderedLevel.Debug && !this.isDebugging) return;

    let message;
    if (typeof scopeOrMessage === 'string') {
      message = scopeOrMessage;
    } else {
      message = params.shift();

      if (scopeOrMessage != null) {
        message = `${scopeOrMessage.prefix} ${message ?? emptyStr}`;
      }
    }

    if (this.isDebugging) {
      console.log(this.timestamp, `[${this.provider!.name}]`, message ?? emptyStr, ...params);
    }

    if (this.output == null || this.level < OrderedLevel.Debug) return;
    this.output.appendLine(`${this.timestamp} ${message ?? emptyStr}${this.toLoggableParams(true, params)}`);
  }

  error(ex: Error | unknown, message?: string, ...params: any[]): void;
  error(ex: Error | unknown, scope?: LogScope, message?: string, ...params: any[]): void;
  error(ex: Error | unknown, scopeOrMessage: LogScope | string | undefined, ...params: any[]): void {
    if (this.level < OrderedLevel.Error && !this.isDebugging) return;

    let message;
    if (scopeOrMessage == null || typeof scopeOrMessage === 'string') {
      message = scopeOrMessage;
    } else {
      message = `${scopeOrMessage.prefix} ${params.shift() ?? emptyStr}`;
    }

    if (message == null) {
      const stack = ex instanceof Error ? ex.stack : undefined;
      if (stack) {
        const match = /.*\s*?at\s(.+?)\s/.exec(stack);
        if (match != null) {
          message = match[1];
        }
      }
    }

    if (this.isDebugging) {
      console.error(this.timestamp, `[${this.provider!.name}]`, message ?? emptyStr, ...params, ex);
    }

    if (this.output == null || this.level < OrderedLevel.Error) return;
    this.output.appendLine(
      `${this.timestamp} ${message ?? emptyStr}${this.toLoggableParams(false, params)}\n${String(ex)}`,
    );
  }

  log(message: string, ...params: any[]): void;
  log(scope: LogScope | undefined, message: string, ...params: any[]): void;
  log(scopeOrMessage: LogScope | string | undefined, ...params: any[]): void {
    if (this.level < OrderedLevel.Info && !this.isDebugging) return;

    let message;
    if (typeof scopeOrMessage === 'string') {
      message = scopeOrMessage;
    } else {
      message = params.shift();

      if (scopeOrMessage != null) {
        message = `${scopeOrMessage.prefix} ${message ?? emptyStr}`;
      }
    }

    if (this.isDebugging) {
      console.log(this.timestamp, `[${this.provider!.name}]`, message ?? emptyStr, ...params);
    }

    if (this.output == null || this.level < OrderedLevel.Info) return;
    this.output.appendLine(`${this.timestamp} ${message ?? emptyStr}${this.toLoggableParams(false, params)}`);
  }

  warn(message: string, ...params: any[]): void;
  warn(scope: LogScope | undefined, message: string, ...params: any[]): void;
  warn(scopeOrMessage: LogScope | string | undefined, ...params: any[]): void {
    if (this.level < OrderedLevel.Warn && !this.isDebugging) return;

    let message;
    if (typeof scopeOrMessage === 'string') {
      message = scopeOrMessage;
    } else {
      message = params.shift();

      if (scopeOrMessage != null) {
        message = `${scopeOrMessage.prefix} ${message ?? emptyStr}`;
      }
    }

    if (this.isDebugging) {
      console.warn(this.timestamp, `[${this.provider!.name}]`, message ?? emptyStr, ...params);
    }

    if (this.output == null || this.level < OrderedLevel.Warn) return;
    this.output.appendLine(`${this.timestamp} ${message ?? emptyStr}${this.toLoggableParams(false, params)}`);
  }

  showOutputChannel(preserveFocus?: boolean): void {
    this.output?.show?.(preserveFocus);
  }

  toLoggable(o: any, sanitize?: ((key: string, value: any) => any) | undefined) {
    if (typeof o !== 'object') return String(o);

    const loggable = this.provider!.toLoggable?.(o);
    if (loggable != null) return loggable;

    try {
      return JSON.stringify(o, sanitize);
    } catch {
      return '<error>';
    }
  }

  private toLoggableParams(debugOnly: boolean, params: any[]) {
    if (params.length === 0 || (debugOnly && this.level < OrderedLevel.Debug && !this.isDebugging)) {
      return emptyStr;
    }

    const loggableParams = params.map(p => this.toLoggable(p)).join(', ');
    return loggableParams.length !== 0 ? ` \u2014 ${loggableParams}` : emptyStr;
  }
})();

function toOrderedLevel(logLevel: LogLevel): OrderedLevel {
  switch (logLevel) {
    case 'off':
      return OrderedLevel.Off;
    case 'error':
      return OrderedLevel.Error;
    case 'warn':
      return OrderedLevel.Warn;
    case 'info':
      return OrderedLevel.Info;
    case 'debug':
      return OrderedLevel.Debug;
    default:
      return OrderedLevel.Off;
  }
}

export const customLoggableNameFns = new WeakMap<object, (instance: any, name: string) => string>();

export function getLoggableName(instance: object): string {
  let ctor;
  if (typeof instance === 'function') {
    ctor = instance.prototype?.constructor;
    if (ctor == null) return instance.name;
  } else {
    ctor = instance.constructor;
  }

  let name: string = ctor?.name ?? '';
  // Strip webpack module name (since I never name classes with an _)
  const index = name.indexOf('_');
  if (index !== -1) {
    name = name.substring(index + 1);
  }

  const customNameFn = customLoggableNameFns.get(ctor);
  return customNameFn?.(instance, name) ?? name;
}

export interface LogProvider {
  enabled(logLevel: LogLevel): boolean;
  log(logLevel: LogLevel, scope: LogScope | undefined, message: string, ...params: any[]): void;
}

export const defaultLogProvider: LogProvider = {
  enabled: (logLevel: LogLevel) => Logger.enabled(logLevel),
  log: (logLevel: LogLevel, scope: LogScope | undefined, message: string, ...params: any[]) => {
    switch (logLevel) {
      case 'error':
        Logger.error(undefined, scope, message, ...params);
        break;
      case 'warn':
        Logger.warn(scope, message, ...params);
        break;
      case 'info':
        Logger.log(scope, message, ...params);
        break;
      default:
        Logger.debug(scope, message, ...params);
        break;
    }
  },
};
