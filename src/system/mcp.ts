import { version, lm, env } from 'vscode';
import { openUrl } from './uris';
import { satisfies } from './version';
import { isHostVSCode } from './vscode';

export function supportsMcpDefinitionProvider(): boolean {
  return satisfies(version, '>= 1.101.0') && lm.registerMcpServerDefinitionProvider != null;
}

export function supportsMcpUrlHandler(hostAppName: string | undefined): boolean {
  if (!hostAppName) return false;

  return isHostVSCode(hostAppName) && satisfies(version, '>= 1.102.0');
}

export function installMcpViaUrlHandler(config: Record<string, unknown>): void {
  const url = `${env.uriScheme}:mcp/install?${encodeURIComponent(JSON.stringify(config))}`;
  void openUrl(url);
}
