/**
 * Tiny change notifier. Every write (repository call, sync transition) calls notify(); hooks that
 * read data subscribe and re-run their query. Works with useSyncExternalStore.
 */
export class ChangeBus {
  private version = 0;
  private readonly listeners = new Set<() => void>();

  notify = (): void => {
    this.version += 1;
    for (const listener of [...this.listeners]) listener();
  };

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getVersion = (): number => this.version;
}
