import { Uri, workspace } from 'vscode';
import { Component, getAllComponents, getComponentByTagName } from '@wc-toolkit/cem-utilities';
import { Container } from '../container';
import { Logger } from '../system/logger';

export interface CustomElementsManifestReader {
  getAllComponents(): Promise<Component[]>;
  getComponentByTagName(tag: string): Promise<Component | undefined>;
  //   private ensureManifest(force?: boolean): Promise<boolean>;
}

export class ManifestsReader implements CustomElementsManifestReader {
  private manifests: ManifestReader[] | undefined = undefined;
  constructor(private readonly _container: Container) {}

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
}

export class ManifestReader implements CustomElementsManifestReader {
  private manifest: Record<string, unknown> | undefined;
  constructor(private readonly container: Container, private readonly uri: Uri) {}

  private async ensureManifest(force: boolean = false): Promise<boolean> {
    if (this.manifest !== undefined && !force) {
      return true;
    }

    try {
      const manifest = await workspace.fs.readFile(this.uri);
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

  async getComponentByTagName(tag: string) {
    await this.ensureManifest();
    if (this.manifest === undefined) {
      return undefined;
    }
    return getComponentByTagName(this.manifest, tag);
  }
}
