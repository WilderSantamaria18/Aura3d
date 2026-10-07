// Vitest setup file for Node test environment

const memoryStore = new Map<string, string>();

const localStorageMock: Storage = {
  getItem: (key: string): string | null => memoryStore.get(key) ?? null,
  setItem: (key: string, value: string): void => {
    memoryStore.set(key, String(value));
  },
  removeItem: (key: string): void => {
    memoryStore.delete(key);
  },
  clear: (): void => {
    memoryStore.clear();
  },
  get length(): number {
    return memoryStore.size;
  },
  key: (index: number): string | null => {
    return Array.from(memoryStore.keys())[index] ?? null;
  },
};

if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true,
  });
}
