import { join } from 'path';
import { env, workspace, Uri } from 'vscode';

let _hostAppName: string | undefined | null;
export async function getHostAppName(): Promise<string | undefined> {
  if (_hostAppName !== undefined) return _hostAppName ?? undefined;

  switch (env.appName) {
    case 'Visual Studio Code':
      _hostAppName = 'code';
      break;
    case 'Visual Studio Code - Insiders':
      _hostAppName = 'code-insiders';
      break;
    case 'Visual Studio Code - Exploration':
      _hostAppName = 'code-exploration';
      break;
    case 'VSCodium':
      _hostAppName = 'codium';
      break;
    case 'Cursor':
      _hostAppName = 'cursor';
      break;
    case 'Windsurf':
      _hostAppName = 'windsurf';
      break;
    default: {
      try {
        const bytes = await workspace.fs.readFile(Uri.file(join(env.appRoot, 'product.json')));
        const product = JSON.parse(new TextDecoder().decode(bytes));
        _hostAppName = product.applicationName;
      } catch {
        _hostAppName = null;
      }

      break;
    }
  }

  return _hostAppName ?? undefined;
}

export function isHostVSCode(hostAppName: string | undefined): boolean {
  if (!hostAppName) return false;

  return ['code', 'code-insiders', 'code-exploration'].includes(hostAppName);
}
