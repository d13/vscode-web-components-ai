import { TreeItem, TreeItemCollapsibleState, Uri, ThemeIcon, ThemeColor, workspace } from 'vscode';
import { ManifestSource } from '../../cem/locator';

/**
 * Represents a manifest item in the tree view
 */
export class ManifestItemNode extends TreeItem {
  public readonly uri: Uri;
  public readonly sources: ManifestSource[];
  public readonly isExcluded: boolean;

  constructor(uri: Uri, sources: ManifestSource[], isExcluded: boolean = false) {
    const workspaceFolder = workspace.getWorkspaceFolder(uri);
    const relativePath = workspaceFolder ? workspace.asRelativePath(uri, false) : uri.fsPath;

    super(relativePath, TreeItemCollapsibleState.None);

    this.uri = uri;
    this.sources = sources;
    this.isExcluded = isExcluded;

    // Set the tooltip with detailed information
    this.tooltip = this.createTooltip();

    // Set the description based on source information
    this.description = this.createDescription();

    // Set the icon based on exclusion status
    this.iconPath = isExcluded
      ? new ThemeIcon('eye-closed', new ThemeColor('disabledForeground'))
      : new ThemeIcon('file-code');

    // Set context value for conditional commands
    this.contextValue = isExcluded ? 'manifestExcluded' : 'manifestIncluded';

    // Add command to open the file
    this.command = {
      command: 'vscode.open',
      title: 'Open',
      arguments: [uri],
    };
  }

  private createTooltip(): string {
    const lines: string[] = [];
    lines.push(`**${this.label}**`);
    lines.push(`Path: ${this.uri.fsPath}`);

    if (this.isExcluded) {
      lines.push('Status: **Excluded**');
    } else {
      lines.push('Status: **Included**');
    }

    if (this.sources.length > 0) {
      lines.push('');
      lines.push('**Sources:**');
      this.sources.forEach(source => {
        if (source.dependencyName) {
          lines.push(`• Dependency: ${source.dependencyName}`);
        } else if (source.isLocal) {
          lines.push('• Local workspace');
        }

        if (source.packageJson) {
          const packagePath = workspace.asRelativePath(source.packageJson, false);
          lines.push(`  Package: ${packagePath}`);
        }
      });
    }

    return lines.join('\n');
  }

  private createDescription(): string {
    if (this.sources.length === 0) {
      return this.isExcluded ? '(excluded)' : '';
    }

    const descriptions: string[] = [];

    // Add dependency information
    const dependencies = this.sources.filter(s => s.dependencyName).map(s => s.dependencyName!);

    if (dependencies.length > 0) {
      descriptions.push(`deps: ${dependencies.join(', ')}`);
    }

    // Add local indicator
    const hasLocal = this.sources.some(s => s.isLocal && !s.dependencyName);
    if (hasLocal) {
      descriptions.push('local');
    }

    // Add exclusion status
    if (this.isExcluded) {
      descriptions.push('excluded');
    }

    return descriptions.length > 0 ? `(${descriptions.join(', ')})` : '';
  }
}
