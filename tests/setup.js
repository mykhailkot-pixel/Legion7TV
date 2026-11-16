import { beforeEach, vi } from 'vitest';
import { configureExtensionStore } from '../src/core/store.js';

history.replaceState({}, '', '/c/test-channel');

beforeEach(() => {
    configureExtensionStore({}, vi.fn().mockResolvedValue(undefined));
    document.body.replaceChildren();
    Object.defineProperty(document, 'execCommand', {
        configurable: true,
        value: vi.fn().mockReturnValue(false)
    });
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
});
