import { QuickPickItem, QuickPickItemKind } from 'vscode';

export interface QuickPickSeparator extends QuickPickItem {
  kind: QuickPickItemKind.Separator;
}

export function createQuickPickSeparator<T = QuickPickSeparator>(label?: string): T {
  return { kind: QuickPickItemKind.Separator, label: label ?? '' } as unknown as T;
}
