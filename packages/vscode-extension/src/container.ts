import type { ConfigurationChangeEvent, Disposable, ExtensionContext } from 'vscode';
import { ExtensionMode, window } from 'vscode';
import { ManifestLocationProvider } from './cem/locator';
import type { CustomElementsManifestReader } from './cem/reader';
import { ManifestsProvider } from './cem/reader';
import { getDefinitionProviders } from './mcp/definition-provider.utils';
import { McpProvider } from './mcp/provider';
import { configuration } from './system/configuration';
import { memoize } from './system/decorators/memoize';
import { Logger } from './system/logger';
import { Storage } from './system/storage';
import { ManifestsView } from './views/manifestsView';

export class Container {
  static #instance: Container | undefined;
  static #proxy = new Proxy<Container>({} as Container, {
    get: function (_target, prop) {
      // In case anyone has cached this instance
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

  private _disposables!: Disposable[];

  private constructor(context: ExtensionContext, prerelease: boolean, version: string) {
    this._context = context;
    this._prerelease = prerelease;
    this._version = version;

    this._disposables = [
      configuration,
      (this._storage = new Storage(context)),
      configuration.onDidChangeAny(this.onAnyConfigurationChanged.bind(this)),
    ];

    this._disposables.push((this._locator = new ManifestLocationProvider(this)));
    this._cem = new ManifestsProvider(this);
    this._disposables.push((this._mcp = new McpProvider(this)));

    // Initialize tree view provider
    this._manifestTreeProvider = new ManifestsView(this);
    this._disposables.push(this._manifestTreeProvider);

    // Register the tree view
    this._disposables.push(
      window.createTreeView('wcai.views.cemList', {
        treeDataProvider: this._manifestTreeProvider,
        showCollapseAll: false,
      }),
    );

    queueMicrotask(async () => {
      const definitionProviders = await getDefinitionProviders(this);
      if (definitionProviders != null) {
        this._disposables.push(...definitionProviders);
      }
    });

    context.subscriptions.push({
      dispose: () => {
        this._disposables?.reverse().forEach(d => void d.dispose());
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

  private _manifestTreeProvider: ManifestsView;
  get manifestTreeProvider() {
    return this._manifestTreeProvider;
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
