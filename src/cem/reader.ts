import { Uri, workspace } from 'vscode';
import {
  Component,
  getAllComponents,
  getComponentByClassName,
  getComponentByTagName,
  getComponentPublicMethods,
  getComponentPublicProperties,
  getPropertyOnlyFields,
} from '@wc-toolkit/cem-utilities';
import { Container } from '../container';
import { Logger } from '../system/logger';
import { Package } from 'custom-elements-manifest';

export interface CustomElementsManifestReader {
  getAllComponents(): Promise<Component[]>;
  getComponentByTagName(tag: string): Promise<Component | undefined>;
  getComponentByClassName(className: string): Promise<Component | undefined>;
  searchComponents(query: string, matching?: 'strict' | 'all' | 'any'): Promise<Component[]>;
  //   private ensureManifest(force?: boolean): Promise<boolean>;
}

export class ManifestsProvider implements CustomElementsManifestReader {
  private manifests: ManifestReader[] | undefined = undefined;
  constructor(private readonly _container: Container) {
    this._container.locator.onDidChange(e => {
      this.manifests = this.manifests?.filter(m => e.includes(m.uri));
    });
  }

  private async ensureManifest(force?: boolean): Promise<boolean> {
    if (this.manifests !== undefined && !force) {
      return true;
    }

    const uris = await this._container.locator.getManifests();
    this.manifests = uris.map(u => new ManifestReader(this._container, u));
    if (uris.length > 0) {
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
}

export class ManifestReader implements CustomElementsManifestReader {
  private manifest: Package | undefined;
  constructor(private readonly container: Container, private readonly _uri: Uri) {}

  get uri(): Uri {
    return this._uri;
  }

  private async ensureManifest(force: boolean = false): Promise<boolean> {
    if (this.manifest !== undefined && !force) {
      return true;
    }

    try {
      const manifest = await workspace.fs.readFile(this._uri);
      this.manifest = JSON.parse(manifest.toString());
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
    return getAllComponents(this.manifest);
  }

  async getComponentByTagName(tag: string): Promise<Component | undefined> {
    await this.ensureManifest();
    if (this.manifest === undefined) {
      return undefined;
    }
    return getComponentByTagName(this.manifest, tag);
  }

  async getComponentByClassName(className: string): Promise<Component | undefined> {
    await this.ensureManifest();
    if (this.manifest === undefined) {
      return undefined;
    }
    return getComponentByClassName(this.manifest, className);
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

    const components = getAllComponents(this.manifest);
    return filterComponents(components, query, matching);
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
