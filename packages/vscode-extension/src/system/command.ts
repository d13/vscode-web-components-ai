import type { Disposable } from 'vscode';
import { commands } from 'vscode';
import type { CommandBase } from '../commands/base';
import type { Commands, CoreCommands } from '../constants';
import type { Container } from '../container';

// Need the ability to register commands that are in the package.json
//   these commands and their arguments need to be strongly typed

export type CommandCallback = Parameters<typeof commands.registerCommand>[1];

// export interface DeferredCommand {
//   commands: Commands[];
//   callback: (container: Container) => CommandCallback;
//   thisArg?: any;
// }

// const registrableCommands: DeferredCommand[] = [];
// export function deferRegisteredCommand(
//   commands: Commands | Commands[],
//   callback: DeferredCommand['callback'],
//   thisArg?: any,
// ): void {
//   if (!Array.isArray(commands)) {
//     commands = [commands];
//   }
//   const command: DeferredCommand = { commands, callback, thisArg };
//   registrableCommands.push(command);
// }

// export function registerDeferredCommands(container: Container): Disposable[] {
//   return registrableCommands.reduce((disposables: Disposable[], deferredCommand: DeferredCommand) => {
//     const callback = deferredCommand.callback(container);
//     deferredCommand.commands.forEach((command: Commands) => {
//       const disposable = commands.registerCommand(command, callback, deferredCommand.thisArg);
//       disposables.push(disposable);
//     });
//     return disposables;
//   }, []);
// }

export type CommandConstructor = new (container: Container, ...args: any[]) => CommandBase;
const registrableCommands: CommandConstructor[] = [];
export function deferRegisteredCommand(commandClass: CommandConstructor): void {
  registrableCommands.push(commandClass);
}
export function registerDeferredCommands(container: Container): Disposable[] {
  return registrableCommands.map(c => new c(container));
}

export function registerCommand(command: Commands, callback: CommandCallback, thisArg?: any): Disposable {
  return commands.registerCommand(command, callback, thisArg);
}

export function executeCommand<U = any>(command: Commands): Thenable<U>;
export function executeCommand<T = unknown, U = any>(command: Commands, arg: T): Thenable<U>;
export function executeCommand<T extends [...unknown[]] = [], U = any>(command: Commands, ...args: T): Thenable<U>;
export function executeCommand<T extends [...unknown[]] = [], U = any>(command: Commands, ...args: T): Thenable<U> {
  return commands.executeCommand<U>(command, ...args);
}

export function executeCoreCommand<T = unknown, U = any>(command: CoreCommands, arg: T): Thenable<U>;
export function executeCoreCommand<T extends [...unknown[]] = [], U = any>(
  command: CoreCommands,
  ...args: T
): Thenable<U>;
export function executeCoreCommand<T extends [...unknown[]] = [], U = any>(
  command: CoreCommands,
  ...args: T
): Thenable<U> {
  return commands.executeCommand<U>(command, ...args);
}
