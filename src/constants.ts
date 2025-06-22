/* eslint-disable @typescript-eslint/no-empty-object-type */
export const extensionPrefix = 'wcai';

export type SecretKeys = string;

export type DeprecatedGlobalStorage = {};

export type GlobalStorage = {};

export type DeprecatedWorkspaceStorage = {};

export type WorkspaceStorage = {};

export type Commands = `wcai.${string}`;

export type CoreCommands = 'vscode.open' | 'setContext';
