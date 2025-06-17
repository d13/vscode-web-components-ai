import { TreeDataProvider, TreeItem, EventEmitter, Event, Disposable, ProviderResult, window } from 'vscode';
import { Container } from '../container';

/**
 * Base class for tree data providers that simplifies common tree view functionality
 */
export abstract class ViewBase<T extends TreeItem> implements TreeDataProvider<T>, Disposable {
  private _disposables: Disposable[] = [];
  private _onDidChangeTreeData: EventEmitter<T | undefined | null | void> = new EventEmitter<
    T | undefined | null | void
  >();
  readonly onDidChangeTreeData: Event<T | undefined | null | void> = this._onDidChangeTreeData.event;

  protected _isRefreshing = false;
  protected _data: T[] | undefined = undefined;

  constructor(protected readonly container: Container) {
    this._disposables.push(this._onDidChangeTreeData);
  }

  /**
   * Gets whether the view is currently refreshing
   */
  get isRefreshing(): boolean {
    return this._isRefreshing;
  }

  /**
   * Gets the current data items
   */
  get data(): T[] | undefined {
    return this._data;
  }

  /**
   * Abstract method to load data for the tree view
   */
  protected abstract loadData(): Promise<T[]>;

  /**
   * Gets the tree item representation of an element
   */
  abstract getTreeItem(element: T): TreeItem | Thenable<TreeItem>;

  /**
   * Gets the children of an element
   */
  abstract getChildren(element?: T): ProviderResult<T[]>;

  /**
   * Refreshes the tree view data
   */
  async refresh(element?: T): Promise<void> {
    if (this._isRefreshing) {
      return;
    }

    this._isRefreshing = true;
    // Fire change event to show loading state
    this._onDidChangeTreeData.fire(element);

    try {
      this._data = await this.loadData();
      this._onDidChangeTreeData.fire(element);
    } catch (error) {
      window.showErrorMessage(`Failed to refresh tree view: ${error}`);
    } finally {
      this._isRefreshing = false;
      // Fire change event again when refreshing is complete
      this._onDidChangeTreeData.fire(element);
    }
  }

  /**
   * Forces a refresh of the tree view data
   */
  async forceRefresh(): Promise<void> {
    this._data = undefined;
    await this.refresh();
  }

  /**
   * Fires a tree data change event for a specific element or the entire tree
   */
  protected fireTreeDataChanged(element?: T): void {
    this._onDidChangeTreeData.fire(element);
  }

  /**
   * Disposes of the view and its resources
   */
  dispose(): void {
    this._disposables.forEach(d => d.dispose());
  }
}
