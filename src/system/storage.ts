import type { Event, ExtensionContext, SecretStorageChangeEvent } from 'vscode';
import { Disposable, EventEmitter } from 'vscode';
import { extensionPrefix } from '../constants';
import type {
  DeprecatedGlobalStorage,
  DeprecatedWorkspaceStorage,
  GlobalStorage,
  SecretKeys,
  WorkspaceStorage,
} from '../constants';
import { debug } from './decorators/log';

type GlobalStorageKeys = keyof (GlobalStorage & DeprecatedGlobalStorage);
type WorkspaceStorageKeys = keyof (WorkspaceStorage & DeprecatedWorkspaceStorage);

export type StorageChangeEvent =
  | {
      /**
       * The key of the stored value that has changed.
       */
      readonly keys: GlobalStorageKeys[];
      readonly workspace: false;
    }
  | {
      /**
       * The key of the stored value that has changed.
       */
      readonly keys: WorkspaceStorageKeys[];
      readonly workspace: true;
    };

export class Storage implements Disposable {
  private _onDidChange = new EventEmitter<StorageChangeEvent>();
  get onDidChange(): Event<StorageChangeEvent> {
    return this._onDidChange.event;
  }

  private _onDidChangeSecrets = new EventEmitter<SecretStorageChangeEvent>();
  get onDidChangeSecrets(): Event<SecretStorageChangeEvent> {
    return this._onDidChangeSecrets.event;
  }

  private readonly _disposable: Disposable;
  constructor(private readonly context: ExtensionContext) {
    this._disposable = Disposable.from(
      this._onDidChange,
      this._onDidChangeSecrets,
      this.context.secrets.onDidChange(e => this._onDidChangeSecrets.fire(e)),
    );
  }

  dispose(): void {
    this._disposable.dispose();
  }

  get<T extends keyof GlobalStorage>(key: T): GlobalStorage[T] | undefined;
  /** @deprecated */
  get<T extends keyof DeprecatedGlobalStorage>(key: T): DeprecatedGlobalStorage[T] | undefined;
  get<T extends keyof GlobalStorage>(key: T, defaultValue: GlobalStorage[T]): GlobalStorage[T];
  @debug({ logThreshold: 50 })
  get(key: GlobalStorageKeys, defaultValue?: unknown): unknown | undefined {
    return this.context.globalState.get(`${extensionPrefix}:${key}`, defaultValue);
  }

  @debug({ logThreshold: 250 })
  async delete(key: GlobalStorageKeys): Promise<void> {
    await this.context.globalState.update(`${extensionPrefix}:${key}`, undefined);
    this._onDidChange.fire({ keys: [key], workspace: false });
  }

  @debug({ args: { 1: false }, logThreshold: 250 })
  async store<T extends keyof GlobalStorage>(key: T, value: GlobalStorage[T] | undefined): Promise<void> {
    await this.context.globalState.update(`${extensionPrefix}:${key}`, value);
    this._onDidChange.fire({ keys: [key], workspace: false });
  }

  @debug({ args: false, logThreshold: 250 })
  async getSecret(key: SecretKeys): Promise<string | undefined> {
    return this.context.secrets.get(key);
  }

  @debug({ args: false, logThreshold: 250 })
  async deleteSecret(key: SecretKeys): Promise<void> {
    return this.context.secrets.delete(key);
  }

  @debug({ args: false, logThreshold: 250 })
  async storeSecret(key: SecretKeys, value: string): Promise<void> {
    return this.context.secrets.store(key, value);
  }

  getWorkspace<T extends keyof WorkspaceStorage>(key: T): WorkspaceStorage[T] | undefined;
  /** @deprecated */
  getWorkspace<T extends keyof DeprecatedWorkspaceStorage>(key: T): DeprecatedWorkspaceStorage[T] | undefined;
  getWorkspace<T extends keyof WorkspaceStorage>(key: T, defaultValue: WorkspaceStorage[T]): WorkspaceStorage[T];
  @debug({ logThreshold: 25 })
  getWorkspace(key: WorkspaceStorageKeys, defaultValue?: unknown): unknown | undefined {
    return this.context.workspaceState.get(`${extensionPrefix}:${key}`, defaultValue);
  }

  @debug({ logThreshold: 250 })
  async deleteWorkspace(key: WorkspaceStorageKeys): Promise<void> {
    await this.context.workspaceState.update(`${extensionPrefix}:${key}`, undefined);
    this._onDidChange.fire({ keys: [key], workspace: true });
  }

  @debug({ args: { 1: false }, logThreshold: 250 })
  async storeWorkspace<T extends keyof WorkspaceStorage>(
    key: T,
    value: WorkspaceStorage[T] | undefined,
  ): Promise<void> {
    await this.context.workspaceState.update(`${extensionPrefix}:${key}`, value);
    this._onDidChange.fire({ keys: [key], workspace: true });
  }
}
