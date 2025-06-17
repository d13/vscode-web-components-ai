import { TreeItem, TreeItemCollapsibleState, ThemeIcon } from 'vscode';

/**
 * Represents a loading item in the tree view
 */
export class LoadingNode extends TreeItem {
  constructor() {
    super('Loading manifests...', TreeItemCollapsibleState.None);
    this.iconPath = new ThemeIcon('loading~spin');
    this.contextValue = 'loading';
  }
}
