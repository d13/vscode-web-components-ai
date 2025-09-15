import { version, lm } from 'vscode';
import { satisfies } from './version';

export function supportsMcpDefinitionProvider(): boolean {
  return satisfies(version, '>= 1.101.0') && lm.registerMcpServerDefinitionProvider != null;
}
