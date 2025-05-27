import { Container } from '../container';
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
    super(container, 'wcai.locateManifests');
  }

  async execute() {
    void this.container.locator.locate().catch(error => {
      Logger.error('Failed to locate manifests', error);
    });
  }
}
