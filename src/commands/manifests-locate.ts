import { ProgressLocation, window } from 'vscode';
import type { ManifestLocateOptions } from '../cem/locator';
import type { Container } from '../container';
import { command } from '../system/decorators/command';
import { Logger } from '../system/logger';
import { CommandBase } from './base';

// @command('wcai.locateManifests')
// export function locateManifests(_container: Container) {
//     return () => {
//         console.log('Locate manifests command executed');
//     };
// }

@command()
export class LocateManifestsCommand extends CommandBase {
  constructor(container: Container) {
    super(container, 'wcai.manifests.locate');
  }

  async execute(options?: ManifestLocateOptions) {
    await window.withProgress(
      {
        location: ProgressLocation.Notification,
        title: 'Locating manifests...',
        cancellable: false,
      },
      async () => {
        return this.container.locator
          .locate(options)
          .then(manifests => {
            const message = `Located ${manifests.length} manifest files`;
            Logger.log(message);
            window.showInformationMessage(message);
          })
          .catch(error => {
            Logger.error('Failed to locate manifests', error);
          });
      },
    );
  }
}
