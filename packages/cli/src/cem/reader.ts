import type { Component } from '@wc-toolkit/cem-utilities';
import {
  getAllComponents,
  getComponentByClassName,
  getComponentByTagName,
  getComponentPublicMethods,
  getPropertyOnlyFields,
} from '@wc-toolkit/cem-utilities';
import type { Package } from 'custom-elements-manifest';
import { promises as fs } from 'fs';
import { Uri, exists, readTextFile } from '../utils/uri';
import { EventEmitter, type Disposable, type Event } from '../utils/events';
import { Logger } from '../utils/logger';
import type { ManifestLocationProvider } from './locator';

export interface CustomElementsManifestReader extends Disposable {
  getAllComponents(): Promise<Component[]>;
  getComponentByTagName(tag: string): Promise<Component | undefined>;
  getComponentByClassName(className: string): Promise<Component | undefined>;
  searchComponents(query: string, matching?: 'strict' | 'all' | 'any'): Promise<Component[]>;
}

export class ManifestsProvider implements CustomElementsManifestReader {
  private manifests: ManifestReader[] | undefined;
  private _cachedEtag: number | undefined;
  private _onDidChange = new EventEmitter<void>();

  constructor(private readonly _locator: ManifestLocationProvider) {
    this._locator.onDidChange(() => {
      this.clearManifests();
      this._onDidChange.fire();
    });
  }

  get onDidChange(): Event<void> {
    return this._onDidChange.event;
  }

  private async ensureManifest(): Promise<void> {
    const etag = this._locator.etag;
    if (this.manifests !== undefined && this._cachedEtag === etag) {
      return;
    }

    this.clearManifests();

    const manifestUris = await this._locator.getManifests();
    const excludedUris = new Set<string>(); // TODO: Add configuration support

    this.manifests = [];
    for (const uri of manifestUris) {
      if (excludedUris.has(uri.toString())) {
        continue;
      }

      const reader = new ManifestReader(uri);
      this.manifests.push(reader);
    }

    this._cachedEtag = etag;
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
    this._onDidChange.dispose();
  }
}

export class ManifestReader implements CustomElementsManifestReader {
  private manifest: Package | undefined;
  private _lastModified: number | undefined;
  private _cachedComponents: Component[] | undefined;
  private _cachedComponentsByTag: Map<string, Component> = new Map();
  private _cachedComponentsByClass: Map<string, Component> = new Map();
  private _searchCache: Map<string, Component[]> = new Map();
  private _onDidChange = new EventEmitter<void>();

  constructor(private readonly _uri: Uri) {}

  get onDidChange(): Event<void> {
    return this._onDidChange.event;
  }

  get uri(): Uri {
    return this._uri;
  }

  private async ensureManifest(): Promise<void> {
    if (!(await exists(this._uri))) {
      return;
    }

    try {
      const stats = await fs.stat(this._uri.fsPath);
      const lastModified = stats.mtime.getTime();

      if (this.manifest !== undefined && this._lastModified === lastModified) {
        return;
      }

      const content = await readTextFile(this._uri);
      this.manifest = JSON.parse(content) as Package;
      this._lastModified = lastModified;

      // Clear caches when manifest changes
      this.clearCaches();
      this._onDidChange.fire();
    } catch (error) {
      Logger.error(`Failed to read manifest ${this._uri.toString()}:`, error);
      this.manifest = undefined;
    }
  }

  private async hasChanged(): Promise<boolean> {
    if (!(await exists(this._uri))) {
      return this.manifest !== undefined;
    }

    try {
      const stats = await fs.stat(this._uri.fsPath);
      const lastModified = stats.mtime.getTime();
      return this._lastModified !== lastModified;
    } catch {
      return true;
    }
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

  dispose(): void {
    this.clearCaches();
    this._onDidChange.dispose();
  }
}

// Utility functions for component filtering and details
function filterComponent(component: Component, query: string): boolean {
  const lowerQuery = query.toLowerCase();

  // Check tag name
  if (component.tagName?.toLowerCase().includes(lowerQuery)) {
    return true;
  }

  // Check class name
  if (typeof component.className === 'string' && component.className.toLowerCase().includes(lowerQuery)) {
    return true;
  }

  // Check name
  if (component.name?.toLowerCase().includes(lowerQuery)) {
    return true;
  }

  // Check description
  if (component.description?.toLowerCase().includes(lowerQuery)) {
    return true;
  }

  return false;
}

function filterComponents(components: Component[], query: string, matching?: 'strict' | 'all' | 'any'): Component[] {
  if (matching === 'strict') {
    return components.filter(c => c.tagName === query || c.className === query || c.name === query);
  }

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
