export * from './schema';
export * from './manager';

import { getConfigManager } from './manager';

// Convenience functions for common configuration operations
export async function loadConfig(workingDirectory?: string) {
  const manager = getConfigManager(workingDirectory);
  return manager.loadConfig();
}

export function getConfig(workingDirectory?: string) {
  const manager = getConfigManager(workingDirectory);
  return manager.getConfig();
}

export function updateConfig(updates: any, workingDirectory?: string) {
  const manager = getConfigManager(workingDirectory);
  return manager.updateConfig(updates);
}

export async function saveLocalConfig(workingDirectory?: string) {
  const manager = getConfigManager(workingDirectory);
  return manager.saveLocalConfig();
}

export async function saveGlobalConfig(workingDirectory?: string) {
  const manager = getConfigManager(workingDirectory);
  return manager.saveGlobalConfig();
}
