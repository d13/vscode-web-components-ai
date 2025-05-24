import { LogLevel } from './system/logger.constants';

export interface Config {
  readonly outputLevel: LogLevel;
}

export type CoreConfig = {
  readonly files: {
    readonly exclude: Record<string, boolean>;
  };
  readonly search: {
    readonly exclude: Record<string, boolean>;
  };
};
