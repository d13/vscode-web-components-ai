import {
  Uri,
  EventEmitter,
  workspace,
  WorkspaceFoldersChangeEvent,
  Disposable,
  Event,
  CancellationToken,
} from 'vscode';

export class ManifestLocationProvider {
  private _disposables: Disposable[] = [];
  private _manifestUris: Set<Uri> | undefined = undefined;

  private _onDidChange: EventEmitter<Uri[]> = new EventEmitter<Uri[]>();
  get onDidChange(): Event<Uri[]> {
    return this._onDidChange.event;
  }

  constructor() {
    this._disposables.push(
      workspace.onDidChangeWorkspaceFolders((_e: WorkspaceFoldersChangeEvent) => this.locateAllManifests()),
    );
  }

  locateAllManifests(options?: { force?: boolean; token?: CancellationToken }) {}

  dispose() {
    this._disposables.forEach(d => d.dispose());
  }
}
