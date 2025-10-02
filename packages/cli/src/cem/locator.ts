import { promises as fs } from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { Uri } from '../utils/uri';
import { EventEmitter, type Disposable, type Event } from '../utils/events';
import { Logger } from '../utils/logger';
import { areEqual } from '../utils/set';

export interface ParsedPackageFile {
  name: string;
  customElements?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export interface ManifestLocateOptions {
  force?: boolean;
  silent?: boolean;
  workingDirectory?: string;
}

export interface ManifestSource {
  uri: Uri;
  workingDirectory?: string;
  packageJson?: Uri;
  dependencyName?: string;
  isLocal: boolean;
}

export class ManifestLocationProvider implements Disposable {
  private _manifestUris: Set<Uri> | undefined = undefined;
  private _manifestSources: Map<string, ManifestSource[]> = new Map();
  private _etag: number | undefined = undefined;
  private _onDidChange = new EventEmitter<Uri[]>();
  private _workingDirectory: string;

  constructor(workingDirectory: string = process.cwd()) {
    this._workingDirectory = workingDirectory;
    // Auto-locate on initialization
    void this.locate();
  }

  get etag(): number | undefined {
    return this._etag;
  }

  get onDidChange(): Event<Uri[]> {
    return this._onDidChange.event;
  }

  async locate(options?: ManifestLocateOptions): Promise<Uri[]> {
    const { force, silent, workingDirectory } = options ?? {};

    if (workingDirectory) {
      this._workingDirectory = workingDirectory;
    }

    if (force === true || this._manifestUris === undefined) {
      const manifestUrisSet = new Set<Uri>();
      this._manifestSources.clear();

      const localPackages = await this.findLocalPackages();
      for (const uri of localPackages) {
        const manifests = await this.findManifestsFromPackage(uri, {
          includeDependencies: true,
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
    sources.push(source);
    this._manifestSources.set(key, sources);
  }

  private async findLocalPackages(): Promise<Uri[]> {
    const localPackages: Uri[] = [];

    try {
      const pattern = path.join(this._workingDirectory, '**/package.json');
      const excludePattern = path.join(this._workingDirectory, '**/node_modules/**/package.json');

      const files = await glob(pattern, {
        ignore: [excludePattern],
        absolute: true,
      });

      localPackages.push(...files.map(f => Uri.file(f)));
    } catch (error) {
      Logger.error('ManifestLocationProvider.findLocalPackages', error);
    }

    return localPackages;
  }

  private async findLocalManifests(): Promise<Uri[]> {
    const localManifests: Uri[] = [];

    try {
      const pattern = path.join(this._workingDirectory, '**/custom-elements.json');
      const excludePattern = path.join(this._workingDirectory, '**/node_modules/**/custom-elements.json');

      const files = await glob(pattern, {
        ignore: [excludePattern],
        absolute: true,
      });

      for (const file of files) {
        const uri = Uri.file(file);
        localManifests.push(uri);

        this.addManifestSource(uri, {
          uri,
          workingDirectory: this._workingDirectory,
          isLocal: true,
        });
      }
    } catch (error) {
      Logger.error('ManifestLocationProvider.findLocalManifests', error);
    }

    return localManifests;
  }

  private async findManifestsFromPackage(
    packageUri: Uri,
    options?: { includeDependencies?: boolean; isLocal?: boolean },
  ): Promise<Uri[]> {
    const manifests: Uri[] = [];

    try {
      const packageJson = await fs.readFile(packageUri.fsPath, 'utf8');
      const packageData = JSON.parse(packageJson) as ParsedPackageFile;

      if (packageData.customElements) {
        const manifestPath = path.resolve(path.dirname(packageUri.fsPath), packageData.customElements);
        const manifestUri = Uri.file(manifestPath);
        manifests.push(manifestUri);

        this.addManifestSource(manifestUri, {
          uri: manifestUri,
          workingDirectory: this._workingDirectory,
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

        const nodeModulesPath = path.resolve(path.dirname(packageUri.fsPath), 'node_modules');

        for (const [depName] of Object.entries(dependencies)) {
          try {
            const depPackagePath = path.join(nodeModulesPath, depName, 'package.json');
            const depPackageUri = Uri.file(depPackagePath);

            // Check if dependency package.json exists
            try {
              await fs.access(depPackagePath);
              const depManifests = await this.findManifestsFromPackage(depPackageUri, {
                includeDependencies: false,
                isLocal: false,
              });
              manifests.push(...depManifests);
            } catch {
              // Dependency not installed or no package.json, skip
            }
          } catch (error) {
            Logger.debug(`Error processing dependency ${depName}:`, error);
          }
        }
      }
    } catch (error) {
      Logger.error('ManifestLocationProvider.findManifestsFromPackage', error);
    }

    return manifests;
  }

  dispose(): void {
    this._onDidChange.dispose();
  }
}
