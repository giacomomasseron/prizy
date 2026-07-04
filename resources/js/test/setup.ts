import '@testing-library/jest-dom';

// Node.js 25 exposes a native `localStorage` global that is a plain object
// without Storage prototype methods (.clear, .setItem, .getItem, etc.).
// In vitest's jsdom environment we always need a proper Storage implementation.
if (typeof localStorage.clear !== 'function') {
    const store: Record<string, string> = {};
    const mockStorage = {
        getItem: (key: string) => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null),
        setItem: (key: string, value: string) => { store[key] = String(value); },
        removeItem: (key: string) => { delete store[key]; },
        clear: () => { Object.keys(store).forEach(k => delete store[k]); },
        key: (index: number) => Object.keys(store)[index] ?? null,
        get length() { return Object.keys(store).length; },
    };
    Object.defineProperty(globalThis, 'localStorage', {
        value: mockStorage,
        writable: true,
        configurable: true,
    });
}
