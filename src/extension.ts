import type { Disposable, ExtensionContext } from 'vscode';
import { Container } from './container';

export async function activate(context: ExtensionContext) {
  const disposables: Disposable[] = [];
  context.subscriptions.push(...disposables);

  const version: string = context.extension.packageJSON.version;
  const container = Container.create(context, version);

  // waiting for container to be fully loaded first
  await container.ready();
}

export function deactivate() {
  Container.instance.deactivate();
}
