import { TreeItem, TreeItemCollapsibleState, ThemeIcon } from 'vscode';
import { ManifestItemNode } from './manifestItemNode';

/**
 * Represents a group header in the tree view (e.g., "Local Manifests", "Dependencies")
 */
export class ManifestGroupedItemNode extends TreeItem {
  public readonly children: ManifestItemNode[];

  constructor(
    label: string,
    children: ManifestItemNode[],
    collapsibleState: TreeItemCollapsibleState = TreeItemCollapsibleState.Expanded,
  ) {
    super(label, collapsibleState);

    this.children = children;
    this.contextValue = 'manifestGroup';
    this.iconPath = new ThemeIcon('folder');

    // Set description with count
    const excludedCount = children.filter(c => c.isExcluded).length;
    const totalCount = children.length;

    if (excludedCount > 0) {
      this.description = `${totalCount - excludedCount}/${totalCount}`;
    } else {
      this.description = `${totalCount}`;
    }

    this.tooltip = `${label} (${totalCount - excludedCount} included, ${excludedCount} excluded)`;
  }
}
