import type { Component } from '@wc-toolkit/cem-utilities';
import {
  getAllComponents,
  getComponentByClassName,
  getComponentByTagName,
  getComponentPublicMethods,
  getPropertyOnlyFields,
} from '@wc-toolkit/cem-utilities';
import type { Package } from 'custom-elements-manifest';
import type { Disposable, Event, FileSystemWatcher, Uri } from 'vscode';
import { EventEmitter, workspace } from 'vscode';
import type { Container } from '../container';
import { configuration } from '../system/configuration';
import { Logger } from '../system/logger';

export interface CustomElementsManifestReader extends Disposable {
  getAllComponents(): Promise<Component[]>;
  getComponentByTagName(tag: string): Promise<Component | undefined>;
  getComponentByClassName(className: string): Promise<Component | undefined>;
  searchComponents(query: string, matching?: 'strict' | 'all' | 'any'): Promise<Component[]>;
}

export class ManifestsProvider implements CustomElementsManifestReader {
  private manifests: ManifestReader[] | undefined = undefined;
  private _cachedEtag: number | undefined = undefined;
  private disposables: Disposable[] = [];

  constructor(private readonly _container: Container) {
    this.disposables.push(
      this._container.locator.onDidChange(_e => {
        if (this.etagIsStale()) {
          this.clearManifests();
          this._cachedEtag = undefined;
        }
      }),

      // Listen for configuration changes to exclude manifests
      configuration.onDidChangeAny(e => {
        if (e.affectsConfiguration('wcai.manifests.exclude')) {
          // Force refresh when exclude configuration changes
          this.clearManifests();
        }
      }),
    );
  }

  private etagIsStale(): boolean {
    const currentEtag = this._container.locator.etag;
    return this._cachedEtag !== currentEtag;
  }

  private async ensureManifest(force?: boolean): Promise<boolean> {
    const currentEtag = this._container.locator.etag;

    if (!force && this.manifests !== undefined && this._cachedEtag === currentEtag) {
      return true;
    }

    // Dispose of existing manifests if they are cached
    this.clearManifests();

    const uris = await this._container.locator.getManifests();
    const excludeConfig = configuration.get('manifests.exclude');

    // Filter out excluded manifests
    const filteredUris = uris.filter(uri => !excludeConfig.includes(uri.toString()));

    this.manifests = filteredUris.map(u => new ManifestReader(this._container, u));
    this._cachedEtag = currentEtag;

    if (filteredUris.length > 0) {
      return true;
    }

    return false;
  }

  async getAllComponents(): Promise<Component[]> {
    await this.ensureManifest();
    if (this.manifests === undefined) {
      return [];
    }

    const components: Component[] = [];
    for (const manifest of this.manifests) {
      const manifestComponents = await manifest.getAllComponents();
      components.push(...manifestComponents);
    }

    return components;
  }

  async getComponentByTagName(tag: string): Promise<Component | undefined> {
    await this.ensureManifest();
    if (this.manifests === undefined) {
      return undefined;
    }
    for (const manifest of this.manifests) {
      const component = await manifest.getComponentByTagName(tag);
      if (component !== undefined) {
        return component;
      }
    }
    return undefined;
  }

  async getComponentByClassName(className: string): Promise<Component | undefined> {
    await this.ensureManifest();
    if (this.manifests === undefined) {
      return undefined;
    }
    for (const manifest of this.manifests) {
      const component = await manifest.getComponentByClassName(className);
      if (component !== undefined) {
        return component;
      }
    }
    return undefined;
  }

  async searchComponents(query: string, matching?: 'strict' | 'all' | 'any'): Promise<Component[]> {
    await this.ensureManifest();
    if (this.manifests === undefined) {
      return [];
    }

    const components: Component[] = [];
    for (const manifest of this.manifests) {
      const manifestComponents = await manifest.searchComponents(query, matching);
      components.push(...manifestComponents);
    }

    return components;
  }

  /**
   * Get cache statistics for debugging and monitoring
   */
  getCacheStats(): {
    manifestCount: number;
    etag: number | undefined;
    manifestStats: Array<{
      uri: string;
      lastModified: number | undefined;
      cachedComponents: number;
      tagCacheSize: number;
      classCacheSize: number;
      searchCacheSize: number;
    }>;
  } {
    return {
      manifestCount: this.manifests?.length || 0,
      etag: this._cachedEtag,
      manifestStats: this.manifests?.map(m => m.getCacheStats()) || [],
    };
  }

  /**
   * Clear all caches manually (useful for debugging or memory management)
   */
  clearCaches(): void {
    this.manifests?.forEach(m => m.clearCaches());
  }

  private clearManifests(): void {
    this.manifests?.forEach(m => m.dispose());
    this.manifests = undefined;
  }

  dispose(): void {
    this.clearManifests();
    this.disposables.forEach(d => d.dispose());
  }
}

export class ManifestReader implements CustomElementsManifestReader {
  private manifest: Package | undefined;
  private _lastModified: number | undefined;
  private _cachedComponents: Component[] | undefined;
  private _cachedComponentsByTag: Map<string, Component> = new Map();
  private _cachedComponentsByClass: Map<string, Component> = new Map();
  private _searchCache: Map<string, Component[]> = new Map();
  private _fileWatcher: FileSystemWatcher | undefined = undefined;
  private _onDidChange = new EventEmitter<void>();

  constructor(
    private readonly container: Container,
    private readonly _uri: Uri,
  ) {
    this._setupFileWatcher();
  }

  get onDidChange(): Event<void> {
    return this._onDidChange.event;
  }

  get uri(): Uri {
    return this._uri;
  }

  private async ensureManifest(force: boolean = false): Promise<boolean> {
    try {
      // Check file modification time for more granular cache invalidation
      const stat = await workspace.fs.stat(this._uri);
      const currentModified = stat.mtime;

      if (this.manifest !== undefined && !force && this._lastModified === currentModified) {
        return true;
      }

      const manifest = await workspace.fs.readFile(this._uri);
      this.manifest = JSON.parse(manifest.toString());
      this._lastModified = currentModified;

      // Clear component caches when manifest is reloaded
      this._cachedComponents = undefined;
      this._cachedComponentsByTag.clear();
      this._cachedComponentsByClass.clear();
      this._searchCache.clear();

      return true;
    } catch (error) {
      Logger.error(error, 'ManifestReader.parseManifest');
    }

    return false;
  }

  async getAllComponents(): Promise<Component[]> {
    await this.ensureManifest();
    if (this.manifest === undefined) {
      return [];
    }
    if (this._cachedComponents !== undefined) {
      return this._cachedComponents;
    }
    const components = getAllComponents(this.manifest);
    this._cachedComponents = components;
    components.forEach(component => {
      if (component.tagName) {
        this._cachedComponentsByTag.set(component.tagName, component);
      }
      if (typeof component.className === 'string') {
        this._cachedComponentsByClass.set(component.className, component);
      }
    });
    return components;
  }

  async getComponentByTagName(tag: string): Promise<Component | undefined> {
    await this.ensureManifest();
    if (this.manifest === undefined) {
      return undefined;
    }
    if (this._cachedComponentsByTag.has(tag)) {
      return this._cachedComponentsByTag.get(tag);
    }
    const component = getComponentByTagName(this.manifest, tag);
    if (component !== undefined) {
      this._cachedComponentsByTag.set(tag, component);
    }
    return component;
  }

  async getComponentByClassName(className: string): Promise<Component | undefined> {
    await this.ensureManifest();
    if (this.manifest === undefined) {
      return undefined;
    }
    if (this._cachedComponentsByClass.has(className)) {
      return this._cachedComponentsByClass.get(className);
    }
    const component = getComponentByClassName(this.manifest, className);
    if (component !== undefined) {
      this._cachedComponentsByClass.set(className, component);
    }
    return component;
  }

  async searchComponents(query: string, matching?: 'strict' | 'all' | 'any'): Promise<Component[]> {
    await this.ensureManifest();
    if (this.manifest === undefined) {
      return [];
    }
    query = query.trim();
    if (query.length === 0) {
      return [];
    }

    // Create cache key based on query and matching type
    const cacheKey = `${query}:${matching || 'any'}`;
    if (this._searchCache.has(cacheKey)) {
      return this._searchCache.get(cacheKey)!;
    }

    // Use cached components if available, otherwise get from manifest
    const components = this._cachedComponents || getAllComponents(this.manifest);
    const results = filterComponents(components, query, matching);

    // Cache the search results
    this._searchCache.set(cacheKey, results);

    return results;
  }

  /**
   * Clear all caches for this manifest reader
   */
  clearCaches(): void {
    this._cachedComponents = undefined;
    this._cachedComponentsByTag.clear();
    this._cachedComponentsByClass.clear();
    this._searchCache.clear();
  }

  /**
   * Get cache statistics for this manifest reader
   */
  getCacheStats(): {
    uri: string;
    lastModified: number | undefined;
    cachedComponents: number;
    tagCacheSize: number;
    classCacheSize: number;
    searchCacheSize: number;
  } {
    return {
      uri: this._uri.toString(),
      lastModified: this._lastModified,
      cachedComponents: this._cachedComponents?.length || 0,
      tagCacheSize: this._cachedComponentsByTag.size,
      classCacheSize: this._cachedComponentsByClass.size,
      searchCacheSize: this._searchCache.size,
    };
  }

  private _setupFileWatcher(): void {
    try {
      // Watch specifically for this manifest file
      this._fileWatcher = workspace.createFileSystemWatcher(this._uri.fsPath);

      const onFileChanged = () => {
        Logger.debug(`Manifest file changed: ${this._uri.toString()}`);
        // Clear all caches when the file changes
        this.clearCaches();
        // Reset last modified to force reload on next access
        this._lastModified = undefined;
        // Notify that this manifest has changed
        this._onDidChange.fire();
      };

      this._fileWatcher.onDidChange(onFileChanged);
      this._fileWatcher.onDidDelete(onFileChanged);
    } catch (error) {
      Logger.error(error, `ManifestReader._setupFileWatcher for ${this._uri.toString()}`);
    }
  }

  /**
   * Dispose of the file watcher and clean up resources
   */
  dispose(): void {
    this._fileWatcher?.dispose();
    this._onDidChange.dispose();
  }
}

function filterComponents(
  components: Component[],
  query: string,
  matching: 'strict' | 'all' | 'any' = 'any',
): Component[] {
  if (matching === 'strict') {
    return components.filter(c => c.tagName === query || c.name === query || c.description === query);
  }

  const filterComponent = (c: Component, text: string): boolean =>
    (c.tagName?.toLowerCase().includes(text) ||
      c.name.toLowerCase().includes(text) ||
      c.description?.toLowerCase().includes(text)) ??
    false;

  const normalizedQuery = query.toLowerCase();
  if (normalizedQuery.includes(' ')) {
    const words = normalizedQuery.split(/\s+/).filter(word => word.length > 0);
    if (matching === 'all') {
      return components.filter(c => words.every(word => filterComponent(c, word)));
    }
    return components.filter(c => words.some(word => filterComponent(c, word)));
  }

  return components.filter(c => filterComponent(c, normalizedQuery));
}

export function getComponentDetails(component: Component, detail: 'basic' | 'public' | 'all' = 'public') {
  switch (detail) {
    case 'basic':
      return getComponentBasicInfo(component);
    case 'public':
      return getComponentPublicApi(component);
    case 'all':
      return component;
  }
}

function getComponentPublicApi(component: Component): Component {
  const properties = getPropertyOnlyFields(component);
  const methods = getComponentPublicMethods(component);
  return {
    ...component,
    members: [...properties, ...methods],
  };
}

function getComponentBasicInfo(component: Component): Component {
  return {
    name: component.name,
    tagName: component.tagName,
    className: component.className,
    description: component.description,
    customElement: component.customElement,
  };
}
