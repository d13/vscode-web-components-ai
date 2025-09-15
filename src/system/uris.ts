import type { Uri } from 'vscode';
import { workspace, env } from 'vscode';

export async function exists(uri: Uri): Promise<boolean> {
  try {
    await workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}

export async function openUrl(url: string): Promise<boolean>;
export async function openUrl(url?: string): Promise<boolean | undefined>;
export async function openUrl(url?: string): Promise<boolean | undefined> {
  if (url == null) return undefined;

  // Pass a string to openExternal to avoid double encoding issues: https://github.com/microsoft/vscode/issues/85930
  // vscode.d.ts currently says it only supports a Uri, but it actually accepts a string too
  return (env.openExternal as unknown as (target: string) => Thenable<boolean>)(url);
}
