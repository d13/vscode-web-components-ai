import { window } from 'vscode';
import type { Container } from '../container';
import { configuration } from '../system/configuration';
import { command } from '../system/decorators/command';
import { ManifestItemNode } from '../views/nodes/manifestItemNode';
import { CommandBase } from './base';

@command()
export class RefreshManifestTreeCommand extends CommandBase {
  constructor(container: Container) {
    super(container, 'wcai.views.cemList.refresh');
  }

  async execute() {
    const treeProvider = this.container.manifestTreeProvider;
    if (treeProvider) {
      await treeProvider.forceRefresh();
    }
  }
}

@command()
export class IncludeManifestCommand extends CommandBase {
  constructor(container: Container) {
    super(container, 'wcai.views.cemList.include');
  }

  async execute(item: ManifestItemNode) {
    if (!item || !(item instanceof ManifestItemNode)) {
      return;
    }

    try {
      const excludeConfig = configuration.get('manifests.exclude');
      const uriString = item.uri.toString();

      // Remove from exclude list if present
      const updatedConfig = excludeConfig.filter(uri => uri !== uriString);

      if (updatedConfig.length === excludeConfig.length) {
        window.showInformationMessage('Manifest is already included');
        return;
      }

      await configuration.updateEffective('manifests.exclude', updatedConfig);
      window.showInformationMessage(`Included manifest: ${item.label}`);
    } catch (error) {
      window.showErrorMessage(`Failed to include manifest: ${error}`);
    }
  }
}

@command()
export class ExcludeManifestCommand extends CommandBase {
  constructor(container: Container) {
    super(container, 'wcai.views.cemList.exclude');
  }

  async execute(item: ManifestItemNode) {
    if (!item || !(item instanceof ManifestItemNode)) {
      return;
    }

    try {
      const excludeConfig = configuration.get('manifests.exclude');
      const uriString = item.uri.toString();

      // Add to exclude list if not already present
      if (excludeConfig.includes(uriString)) {
        window.showInformationMessage('Manifest is already excluded');
        return;
      }

      const updatedConfig = [...excludeConfig, uriString];
      await configuration.updateEffective('manifests.exclude', updatedConfig);
      window.showInformationMessage(`Excluded manifest: ${item.label}`);
    } catch (error) {
      window.showErrorMessage(`Failed to exclude manifest: ${error}`);
    }
  }
}
