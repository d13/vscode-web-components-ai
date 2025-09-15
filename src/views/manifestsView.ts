import type { TreeItem, ProviderResult, Uri, Disposable } from 'vscode';
import type { Container } from '../container';
import { executeCommand } from '../system/command';
import { configuration } from '../system/configuration';
import { ViewBase } from './base';
import { LoadingNode } from './nodes/loadingNode';
import { ManifestGroupedItemNode } from './nodes/manifestGroupedItemNode';
import { ManifestItemNode } from './nodes/manifestItemNode';
import { McpServerNode } from './nodes/mcpServerNode';

type ManifestTreeElement = ManifestItemNode | ManifestGroupedItemNode | LoadingNode | McpServerNode;

/**
 * Tree data provider for Custom Elements Manifests
 */
export class ManifestsView extends ViewBase<ManifestTreeElement> {
  private _groupedData: ManifestGroupedItemNode[] = [];
  private _localDisposables: Disposable[] = [];

  constructor(container: Container) {
    super(container);

    // Listen for changes in the manifest location provider
    this._localDisposables.push(
      this.container.locator.onDidChange(() => {
        this.refresh();
      }),

      // Listen for HTTP server state changes
      this.container.mcp.onDidChangeHttpServerState(() => {
        this.refresh();
      }),

      // Listen for configuration changes
      configuration.onDidChangeAny(e => {
        if (
          e.affectsConfiguration('wcai.manifests.exclude') ||
          e.affectsConfiguration('wcai.mcp.port') ||
          e.affectsConfiguration('wcai.mcp.host')
        ) {
          this.refresh();
        }
      }),
    );

    // Initial load
    queueMicrotask(() => this.refresh());
  }

  /**
   * Loads manifest data from the location provider
   */
  protected async loadData(): Promise<ManifestTreeElement[]> {
    const result: ManifestTreeElement[] = [];

    const manifests = await this.container.locator.getManifests();
    const excludeConfig = configuration.get('manifests.exclude');
    const allSources = this.container.locator.getAllManifestSources();

    if (manifests.length > 0) {
      // Create manifest tree items
      const manifestItems: ManifestItemNode[] = manifests.map(uri => {
        const isExcluded = excludeConfig.includes(uri.toString());
        const sources = allSources.get(uri.toString()) || [];
        return new ManifestItemNode(uri, sources, isExcluded);
      });

      // Group manifests by type
      const localManifests = manifestItems.filter(item => item.sources.some(source => source.isLocal));

      const dependencyManifests = manifestItems.filter(item => item.sources.some(source => !source.isLocal));

      const groups: ManifestGroupedItemNode[] = [];

      if (localManifests.length > 0) {
        groups.push(new ManifestGroupedItemNode('Local Manifests', localManifests));
      }

      if (dependencyManifests.length > 0) {
        groups.push(new ManifestGroupedItemNode('Dependency Manifests', dependencyManifests));
      }

      this._groupedData = groups;
      result.push(...groups);
    }

    // Add MCP server status node at the top
    const serverInfo = this.container.mcp.getServerInfo();
    result.unshift(new McpServerNode(serverInfo));

    return result;
  }

  /**
   * Gets the tree item representation of an element
   */
  getTreeItem(element: ManifestTreeElement): TreeItem {
    return element;
  }

  /**
   * Gets the children of an element
   */
  getChildren(element?: ManifestTreeElement): ProviderResult<ManifestTreeElement[]> {
    if (!element) {
      // Show loading state while refreshing
      if (this.isRefreshing) {
        return [new LoadingNode()];
      }
      // Return root level items (MCP server node + groups)
      return this.data || [];
    }

    if (element instanceof ManifestGroupedItemNode) {
      // Return children of the group
      return element.children;
    }

    // Manifest items, MCP server nodes, and loading nodes have no children
    return [];
  }

  /**
   * Forces a refresh by calling locate with force: true
   */
  override async forceRefresh(): Promise<void> {
    await executeCommand('wcai.manifests.locate', { force: true });
    await super.forceRefresh();
  }

  /**
   * Gets a manifest tree item by URI
   */
  getManifestItem(uri: Uri): ManifestItemNode | undefined {
    for (const group of this._groupedData) {
      const item = group.children.find(child => child.uri.toString() === uri.toString());
      if (item) {
        return item;
      }
    }
    return undefined;
  }

  /**
   * Gets all manifest tree items
   */
  getAllManifestItems(): ManifestItemNode[] {
    const items: ManifestItemNode[] = [];
    for (const group of this._groupedData) {
      items.push(...group.children);
    }
    return items;
  }

  /**
   * Dispose of local resources
   */
  override dispose(): void {
    this._localDisposables.forEach(d => d.dispose());
    super.dispose();
  }
}
