import type { WorkspaceFoldersChangeEvent, Disposable, Event, CancellationToken, WorkspaceFolder } from 'vscode';
import { Uri, EventEmitter, workspace } from 'vscode';
import type { Container } from '../container';
import { Logger } from '../system/logger';
import { areEqual } from '../system/set';

export interface ParsedPackageFile {
  name: string;
  customElements: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export interface ManifestLocateOptions {
  force?: boolean;
  silent?: boolean;
  token?: CancellationToken;
}

export interface ManifestSource {
  uri: Uri;
  workspaceFolder?: WorkspaceFolder;
  packageJson?: Uri;
  dependencyName?: string;
  isLocal: boolean;
}

// TODO: think about this API could be reused to build locators for other component frameworks in the future
export class ManifestLocationProvider implements Disposable {
  private _disposables: Disposable[] = [];
  // TODO: this should be in workspace storage
  private _manifestUris: Set<Uri> | undefined = undefined;
  private _manifestSources: Map<string, ManifestSource[]> = new Map();

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
      this._manifestSources.clear();

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

  getManifestSources(uri: Uri): ManifestSource[] | undefined {
    return this._manifestSources.get(uri.toString());
  }

  getAllManifestSources(): Map<string, ManifestSource[]> {
    return new Map(this._manifestSources);
  }

  private addManifestSource(uri: Uri, source: ManifestSource): void {
    const key = uri.toString();
    const sources = this._manifestSources.get(key) || [];

    // Check if this exact source already exists
    const exists = sources.some(
      s =>
        s.isLocal === source.isLocal &&
        s.packageJson?.toString() === source.packageJson?.toString() &&
        s.dependencyName === source.dependencyName,
    );

    if (!exists) {
      sources.push(source);
      this._manifestSources.set(key, sources);
    }
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

      for (const uri of files) {
        localManifests.push(uri);

        // Track source information for local manifests
        const workspaceFolder = workspace.getWorkspaceFolder(uri);
        this.addManifestSource(uri, {
          uri,
          workspaceFolder,
          isLocal: true,
        });
      }
    } catch (error) {
      Logger.error(error, 'ManifestLocationProvider.findLocalManifests');
    }
    return localManifests;
  }

  private async findManifestsFromPackage(
    packageUri: Uri,
    options?: { isLocal?: boolean; includeDependencies?: boolean; token?: CancellationToken },
  ): Promise<Uri[]> {
    const manifests: Uri[] = [];
    const workspaceFolder = workspace.getWorkspaceFolder(packageUri);

    try {
      const packageJson = await workspace.fs.readFile(packageUri);
      const packageData = JSON.parse(packageJson.toString()) as ParsedPackageFile;

      if (packageData.customElements) {
        const manifestUri = Uri.joinPath(packageUri, '../', packageData.customElements);
        manifests.push(manifestUri);

        // Track source information for package manifest
        this.addManifestSource(manifestUri, {
          uri: manifestUri,
          workspaceFolder,
          packageJson: packageUri,
          dependencyName: packageData.name,
          isLocal: options?.isLocal ?? true,
        });
      }

      if (options?.includeDependencies) {
        const dependencies = {
          ...(packageData.dependencies || {}),
          ...(packageData.devDependencies || {}),
        };

        for (const dep of Object.keys(dependencies)) {
          const depPackageUri = Uri.joinPath(packageUri, '../', 'node_modules', dep, 'package.json');
          const depManifests = await this.findManifestsFromPackage(depPackageUri, {
            isLocal: false,
            includeDependencies: false,
            token: options.token,
          });

          if (depManifests.length > 0) {
            manifests.push(...depManifests);
            // Update source information for dependency manifests
            // for (const manifestUri of depManifests) {
            //   this.addManifestSource(manifestUri, {
            //     uri: manifestUri,
            //     workspaceFolder,
            //     packageJson: depPackageUri,
            //     dependencyName: dep,
            //     isLocal: false,
            //   });
            // }
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
