import { LogLevel } from './system/logger.constants';

export interface Config {
  readonly outputLevel: LogLevel;
  readonly manifests: {
    readonly exclude: string[];
  };
  readonly mcp: {
    readonly port: number | null;
    readonly host: string | null;
    readonly storeHostAndPortOnStart: boolean;
  };
}

export type CoreConfig = {
  readonly files: {
    readonly exclude: Record<string, boolean>;
  };
  readonly search: {
    readonly exclude: Record<string, boolean>;
  };
};
