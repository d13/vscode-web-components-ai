import { ExtensionContext, Disposable, Event, EventEmitter } from 'vscode';

export class Container {
  static #instance: Container | undefined;
  static #proxy = new Proxy<Container>({} as Container, {
    get: function (target, prop: keyof Container) {
      // In case anyone has cached this instance

      if (Container.#instance !== undefined) {
        return Container.#instance[prop];
      }

      // Allow access to config before we are initialized
      //   if (prop === "config") {
      //     return configuration.getAll();
      //   }

      // debugger;
      throw new Error('Container is not initialized');
    },
  });

  static create(context: ExtensionContext, version: string) {
    if (Container.#instance !== undefined) {
      throw new Error('Container already created');
    }
    Container.#instance = new Container(context, version);
    return Container.#instance;
  }

  static get instance() {
    return Container.#instance ?? Container.#proxy;
  }

  get context() {
    return this._context;
  }

  get version() {
    return this._version;
  }

  private _disposables: Disposable[];

  private constructor(private readonly _context: ExtensionContext, private readonly _version: string) {
    this._disposables = [];

    _context.subscriptions.push({
      dispose: () => {
        // Reverse the disposables in case of dependencies
        this._disposables.reverse().forEach(disposable => void disposable.dispose());
      },
    });
  }

  private _onReady: EventEmitter<void> = new EventEmitter<void>();
  get onReady(): Event<void> {
    return this._onReady.event;
  }

  private _ready: boolean = false;
  async ready() {
    if (this._ready) throw new Error('Container is already ready');

    this._ready = true;
    return new Promise<void>(resolve => {
      queueMicrotask(() => {
        resolve();
        this._onReady.fire();
      });
    });
  }

  private _deactivating: boolean = false;
  get deactivating() {
    return this._deactivating;
  }

  deactivate() {
    this._deactivating = true;
  }
}
