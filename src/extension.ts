import { env } from 'process';
import type { ExtensionContext } from 'vscode';
import { window, Uri, ExtensionMode, version } from 'vscode';
import { isWeb } from '@env/platform';
import { Container } from './container';
import { registerDeferredCommands } from './system/command';
import { configuration, Configuration } from './system/configuration';
import { Logger } from './system/logger';
import { fromString } from './system/version';
import './commands';

export function activate(context: ExtensionContext) {
  const extensionName: string = context.extension.packageJSON.displayName;
  const extensionVersion: string = context.extension.packageJSON.version;
  const currentVersion = fromString(extensionVersion);
  const prerelease = currentVersion.minor % 2 === 1;

  Logger.configure(
    {
      name: extensionName,
      createChannel: function (name: string) {
        return window.createOutputChannel(name);
      },
      toLoggable: function (o: any) {
        if (o instanceof Uri) return `Uri(${o.toString(true)})`;
        return undefined;
      },
    },
    configuration.get('outputLevel'),
    context.extensionMode === ExtensionMode.Development,
  );

  Logger.log(
    `${extensionName}${prerelease ? ' (pre-release)' : ''} v${extensionVersion} activating in ${
      env.appName
    }(${version}) on the ${isWeb ? 'web' : 'desktop'}`,
  );

  Configuration.configure(context);
  const container = Container.create(context, prerelease, extensionVersion);

  context.subscriptions.push(...registerDeferredCommands(container));
}

export function deactivate() {
  // nothing to do
  return undefined;
}
