import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

export class Uri {
  private constructor(
    public readonly scheme: string,
    public readonly authority: string,
    public readonly path: string,
    public readonly query: string,
    public readonly fragment: string,
  ) {}

  static file(path: string): Uri {
    const normalized = path.replace(/\\/g, '/');
    return new Uri('file', '', normalized, '', '');
  }

  static parse(value: string): Uri {
    try {
      const url = new URL(value);
      return new Uri(
        url.protocol.slice(0, -1), // Remove trailing ':'
        url.hostname + (url.port ? `:${url.port}` : ''),
        url.pathname,
        url.search.slice(1), // Remove leading '?'
        url.hash.slice(1), // Remove leading '#'
      );
    } catch {
      // Fallback for file paths
      return Uri.file(value);
    }
  }

  static joinPath(base: Uri, ...pathSegments: string[]): Uri {
    const joined = path.posix.join(base.path, ...pathSegments);
    return new Uri(base.scheme, base.authority, joined, base.query, base.fragment);
  }

  get fsPath(): string {
    if (this.scheme === 'file') {
      return this.path;
    }
    throw new Error(`Cannot get fsPath for non-file URI: ${this.scheme}`);
  }

  toString(skipEncoding?: boolean): string {
    if (this.scheme === 'file') {
      return `file://${this.path}`;
    }

    let result = `${this.scheme}://`;
    if (this.authority) {
      result += this.authority;
    }
    result += this.path;
    if (this.query) {
      result += `?${this.query}`;
    }
    if (this.fragment) {
      result += `#${this.fragment}`;
    }
    return result;
  }

  toJSON(): string {
    return this.toString();
  }
}

export async function exists(uri: Uri): Promise<boolean> {
  try {
    await fs.stat(uri.fsPath);
    return true;
  } catch {
    return false;
  }
}

export async function readFile(uri: Uri): Promise<Uint8Array> {
  return fs.readFile(uri.fsPath);
}

export async function readTextFile(uri: Uri): Promise<string> {
  return fs.readFile(uri.fsPath, 'utf8');
}
