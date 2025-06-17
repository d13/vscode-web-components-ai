import { QuickPickItem, Uri, window } from 'vscode';
import { Container } from '../container';
import { command } from '../system/decorators/command';
import { CommandBase } from './base';
import { createQuickPickSeparator } from '../quickpicks/common';
import { executeCommand, executeCoreCommand } from '../system/command';
import { ManifestLocateOptions } from '../cem/locator';
import { sortBy } from '../system/array';
import { showManifestPicker } from '../quickpicks/manifestPicker';

@command()
export class ListManifestsCommand extends CommandBase {
  constructor(container: Container) {
    super(container, 'wcai.manifests.list');
  }

  async execute() {
    const manifests = await this.container.locator.getManifests();
    // show the list of manifests in a quick pick
    const pick = await showManifestPicker(manifests, {
      quickPick: {
        title: 'Custom Elements Manifests',

        matchOnDescription: true,
        matchOnDetail: true,
        canPickMany: false,
        placeHolder: 'Select a manifest to configure (coming soon)',
      },
    });

    if (pick === undefined) {
      return;
    }

    // open the uri in the editor
    void executeCoreCommand('vscode.open', pick, {
      preserveFocus: true,
    });
  }
}
