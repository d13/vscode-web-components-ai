import { isPromise } from 'util/types';
import type { QuickPickItem, QuickPickOptions, Uri } from 'vscode';
import { window, workspace } from 'vscode';
import type { ManifestLocateOptions } from '../cem/locator';
import { sortBy } from '../system/array';
import { executeCommand } from '../system/command';
import { createQuickPickSeparator } from './common';

export interface ManifestPickerItem extends QuickPickItem {
  uri: Uri;
}

export function createManifestPickerItem(uri: Uri): ManifestPickerItem {
  const path = workspace.asRelativePath(uri, false);
  const idx = path.lastIndexOf('/');
  const name = idx !== -1 ? path.substring(idx + 1) : path;
  const description = idx !== -1 ? path.substring(0, idx) : undefined;

  return {
    label: name,
    description: description ? description : undefined,
    alwaysShow: true,
    uri,
  };
}

export async function showManifestPicker(
  manifests: Uri[] | Promise<Uri[] | undefined> | undefined,
  options?: {
    quickPick?: QuickPickOptions;
    showLocateButton?: boolean;
    showLocateButtonOnEmpty?: boolean;
  },
): Promise<Uri | undefined> {
  if (isPromise(manifests)) {
    manifests = await manifests;
  }
  if (manifests === undefined) {
    manifests = [];
  }

  const items: ManifestPickerItem | QuickPickItem[] = [];
  for (const uri of manifests) {
    items.push(createManifestPickerItem(uri));
  }

  const hasManifests = items.length > 0;
  if (hasManifests) {
    items.sort((a, b) => {
      const labelSort = sortBy<QuickPickItem, string>(i => i.label)(a, b);
      if (labelSort !== 0) {
        return labelSort;
      }

      return sortBy<QuickPickItem, string | undefined>(i => i.description ?? '')(a, b);
    });
  } else {
    items.push({
      label: 'No manifests found',
      alwaysShow: true,
    });
  }
  items.push(createQuickPickSeparator());

  const locateManifestsItem = {
    label: `${hasManifests ? 'Locate' : 'Update located'} manifests`,
    detail: 'Locate manifests in workspace and dependencies',
    alwaysShow: true,
  };

  if ((!hasManifests && options?.showLocateButtonOnEmpty === true) || options?.showLocateButton !== false) {
    items.push(locateManifestsItem);
  }

  items.push({ label: 'Cancel', alwaysShow: true });

  const selected = await window.showQuickPick(items, options?.quickPick);

  if (selected === locateManifestsItem) {
    await executeCommand<ManifestLocateOptions>('wcai.manifests.locate', { force: hasManifests });
  }

  return (selected as ManifestPickerItem)?.uri;
}
