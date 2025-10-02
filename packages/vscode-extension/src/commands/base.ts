import type { Disposable } from 'vscode';
import type { Commands } from '../constants';
import type { Container } from '../container';
import { registerCommand } from '../system/command';

export abstract class CommandBase implements Disposable {
  private readonly _disposables: Disposable[] = [];

  constructor(
    protected readonly container: Container,
    command: Commands | Commands[],
  ) {
    command = Array.isArray(command) ? command : [command];

    this._disposables.push(...command.map(c => registerCommand(c, (...args: any[]) => this.execute(...args), this)));
  }

  abstract execute(...args: any[]): any;

  dispose() {
    this._disposables.forEach(d => d.dispose());
  }
}
