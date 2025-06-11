import {
  Uri,
  EventEmitter,
  workspace,
  WorkspaceFoldersChangeEvent,
  Disposable,
  Event,
  CancellationToken,
} from 'vscode';
import { Container } from '../container';
import { areEqual } from '../system/set';
import { Logger } from '../system/logger';

const emptyDisposable: Disposable = Object.freeze({ dispose: () => {} });
export interface ParsedPackageFile {
  customElements: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export interface ManifestLocateOptions {
  force?: boolean;
  silent?: boolean;
  token?: CancellationToken;
}

// TODO: think about this API could be reused to build locators for other component frameworks in the future
export class ManifestLocationProvider implements Disposable {
  private _disposables: Disposable[] = [];
  // TODO: this should be in workspace storage
  private _manifestUris: Set<Uri> | undefined = undefined;

  private _etag: number | undefined = undefined;
  get etag() {
    return this._etag;
  }

  private _onDidChange: EventEmitter<Uri[]> = new EventEmitter<Uri[]>();
  get onDidChange(): Event<Uri[]> {
    return this._onDidChange.event;
  }

  constructor(private readonly _container: Container) {
    this.locate();

    this._disposables.push(
      // TODO: this should be configurable
      workspace.onDidChangeWorkspaceFolders((_e: WorkspaceFoldersChangeEvent) => this.locate()),
    );
  }

  async locate(options?: ManifestLocateOptions): Promise<Uri[]> {
    const { force, silent, token } = options ?? {};

    // TODO: add etag check for caching
    if (force === true || this._manifestUris === undefined) {
      const manifestUrisSet = new Set<Uri>();

      const localPackages = await this.findLocalPackages();
      for (const uri of localPackages) {
        const manifests = await this.findManifestsFromPackage(uri, {
          includeDependencies: true,
          token,
        });
        manifests.forEach(m => manifestUrisSet.add(m));
      }

      if (manifestUrisSet.size === 0) {
        const localManifests = await this.findLocalManifests();
        localManifests.forEach(m => manifestUrisSet.add(m));
      }

      if (force === true || this._manifestUris == null || !areEqual(this._manifestUris, manifestUrisSet)) {
        this._manifestUris = manifestUrisSet;
        this._etag = Date.now();

        if (silent !== true) {
          const list = Array.from(this._manifestUris);
          this._onDidChange.fire(list);
          return list;
        }
      }
    }

    return Array.from(this._manifestUris);
  }

  async getManifests(): Promise<Uri[]> {
    return await this.locate();
  }

  private async findLocalPackages(): Promise<Uri[]> {
    const localPackages: Uri[] = [];

    try {
      const files = await workspace.findFiles('**/package.json', '**/node_modules/**/package.json');
      localPackages.push(...files);
    } catch (error) {
      Logger.error(error, 'ManifestLocationProvider.findLocalPackages');
    }

    return localPackages;
  }

  private async findLocalManifests(): Promise<Uri[]> {
    const localManifests: Uri[] = [];
    try {
      const files = await workspace.findFiles('**/custom-elements.json', '**/node_modules/**/custom-elements.json');
      localManifests.push(...files);
    } catch (error) {
      Logger.error(error, 'ManifestLocationProvider.findLocalManifests');
    }
    return localManifests;
  }

  private async findManifestsFromPackage(
    uri: Uri,
    options?: { includeDependencies?: boolean; token?: CancellationToken },
  ): Promise<Uri[]> {
    const manifests: Uri[] = [];

    try {
      const packageJson = await workspace.fs.readFile(uri);
      const packageData = JSON.parse(packageJson.toString()) as ParsedPackageFile;

      if (packageData.customElements) {
        const manifestUri = Uri.joinPath(uri, '../', packageData.customElements);
        manifests.push(manifestUri);
      }

      if (options?.includeDependencies) {
        const dependencies = {
          ...(packageData.dependencies || {}),
          ...(packageData.devDependencies || {}),
        };

        for (const dep of Object.keys(dependencies)) {
          const packageUri = Uri.joinPath(uri, '../', 'node_modules', dep, 'package.json');
          const depManifests = await this.findManifestsFromPackage(packageUri, {
            includeDependencies: false,
            token: options.token,
          });
          if (depManifests.length > 0) {
            manifests.push(...depManifests);
          }
        }
      }
    } catch (error) {
      // Handle errors gracefully, such as file not found or JSON parse errors
      // If error is from a dependency, we may want to warn the user their dependencies may not be installed
      Logger.error(error, 'ManifestLocationProvider.findManifestsFromPackage');
    }
    return manifests;
  }

  dispose() {
    this._disposables.forEach(d => d.dispose());
  }
}
