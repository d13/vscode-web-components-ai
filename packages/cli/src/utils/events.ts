import { EventEmitter as NodeEventEmitter } from 'events';

export interface Event<T> {
  (listener: (e: T) => any): Disposable;
}

export interface Disposable {
  dispose(): void;
}

export class EventEmitter<T> implements Disposable {
  private _emitter = new NodeEventEmitter();
  private _disposed = false;

  get event(): Event<T> {
    return (listener: (e: T) => any): Disposable => {
      if (this._disposed) {
        return { dispose: () => {} };
      }

      this._emitter.on('event', listener);
      
      return {
        dispose: () => {
          this._emitter.removeListener('event', listener);
        }
      };
    };
  }

  fire(event: T): void {
    if (!this._disposed) {
      this._emitter.emit('event', event);
    }
  }

  dispose(): void {
    if (!this._disposed) {
      this._disposed = true;
      this._emitter.removeAllListeners();
    }
  }
}
