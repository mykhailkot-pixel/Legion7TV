import { initializeExtensionStore, updateExtensionStore } from '../../src/core/store.js';

async function start() {
    try {
        if (!await initializeExtensionStore())
            throw new Error('browser extension storage API is unavailable');

        const api = globalThis.browser || globalThis.chrome;
        if (api && api.storage && api.storage.onChanged) {
            api.storage.onChanged.addListener((changes, area) => {
                if (area !== 'local') return;
                for (const [key, change] of Object.entries(changes)) {
                    if (change && Object.prototype.hasOwnProperty.call(change, 'newValue')) {
                        updateExtensionStore(key, change.newValue);
                    }
                }
            });
        }
        await import('../../src/main.js');
    } catch (error) {
        console.error('[Legion7TV] extension startup failed', error);
    }
}

start();
