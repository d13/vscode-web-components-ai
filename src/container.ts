import { ConfigurationChangeEvent, Disposable, ExtensionContext, ExtensionMode } from 'vscode';
import { configuration } from './system/configuration';
import { Storage } from './system/storage';
import { Logger } from './system/logger';
import { memoize } from './system/decorators/memoize';
import { ManifestLocationProvider } from './cem/locator';
import { McpProvider } from './mcp/provider';
import { CustomElementsManifestReader, ManifestsProvider } from './cem/reader';

export class Container {
  static #instance: Container | undefined;
  static #proxy = new Proxy<Container>({} as Container, {
    get: function (target, prop) {
      // In case anyone has cached this instance
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      if (Container.#instance != null) return (Container.#instance as any)[prop];

      // Allow access to config before we are initialized
      if (prop === 'config') return configuration.getAll();

      // debugger;
      throw new Error('Container is not initialized');
    },
  });

  static create(context: ExtensionContext, prerelease: boolean, version: string) {
    if (Container.#instance != null) throw new Error('Container is already initialized');

    Container.#instance = new Container(context, prerelease, version);
    return Container.#instance;
  }

  static get instance(): Container {
    return Container.#instance ?? Container.#proxy;
  }

  private constructor(context: ExtensionContext, prerelease: boolean, version: string) {
    this._context = context;
    this._prerelease = prerelease;
    this._version = version;

    const disposables: Disposable[] = [
      configuration,
      (this._storage = new Storage(context)),
      configuration.onDidChangeAny(this.onAnyConfigurationChanged.bind(this)),
    ];

    disposables.push((this._locator = new ManifestLocationProvider(this)));
    this._cem = new ManifestsProvider(this);
    disposables.push((this._mcp = new McpProvider(this)));

    context.subscriptions.push({
      dispose: function () {
        disposables.reverse().forEach(d => void d.dispose());
      },
    });
  }

  private _cem: CustomElementsManifestReader;
  get cem(): CustomElementsManifestReader {
    return this._cem;
  }

  private _context: ExtensionContext;
  get context() {
    return this._context;
  }

  @memoize()
  get debugging(): boolean {
    return this._context.extensionMode === ExtensionMode.Development;
  }

  @memoize()
  get id(): string {
    return this._context.extension.id;
  }

  private _locator: ManifestLocationProvider;
  get locator() {
    return this._locator;
  }

  private _mcp: McpProvider;
  get mcp() {
    return this._mcp;
  }

  private _prerelease: boolean;
  get prerelease(): boolean {
    return this._prerelease;
  }

  @memoize()
  get prereleaseOrDebugging(): boolean {
    return this._prerelease || this.debugging;
  }

  private _storage: Storage;
  get storage() {
    return this._storage;
  }

  private _version: string;
  get version(): string {
    return this._version;
  }

  private onAnyConfigurationChanged(e: ConfigurationChangeEvent) {
    if (configuration.changed(e, 'outputLevel')) {
      Logger.logLevel = configuration.get('outputLevel');
    }
  }
}

export function isContainer(container: any): container is Container {
  return container instanceof Container;
}
