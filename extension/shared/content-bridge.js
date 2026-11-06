import { STORE } from '../../src/core/consts.js';
import { initializeExtensionStore, store, updateExtensionStore } from '../../src/core/store.js';

const EVENTS = {
    pageReady: 'l7tv:extension-page-ready',
    pageInit: 'l7tv:extension-page-init',
    storeWrite: 'l7tv:extension-store-write',
    storeUpdate: 'l7tv:extension-store-update'
};
const PAGE_STORE_KEYS = [
    STORE.pingConfig,
    STORE.pingOnly,
    STORE.pingArchive,
    STORE.chatTabPrefs,
    STORE.linkEncoding
];
const PAGE_STORE_KEY_SET = new Set(PAGE_STORE_KEYS);
const MAX_PAGE_STORAGE_MESSAGE = 4 * 1024 * 1024;
let initialized = false;
let pageBridgeReady = false;

const dispatchJson = (name, value) => {
    window.dispatchEvent(new CustomEvent(name, { detail: JSON.stringify(value) }));
};

function syncPageStore(key, value) {
    if (PAGE_STORE_KEY_SET.has(key)) dispatchJson(EVENTS.storeUpdate, { key, value });
}

window.addEventListener(EVENTS.pageReady, () => {
    pageBridgeReady = true;
    if (!initialized) return;
    const snapshot = Object.fromEntries(PAGE_STORE_KEYS.map((key) => [key, store.get(key)]));
    dispatchJson(EVENTS.pageInit, snapshot);
});

window.addEventListener(EVENTS.storeWrite, (event) => {
    if (event.target !== window || typeof event.detail !== 'string') return;
    if (event.detail.length > MAX_PAGE_STORAGE_MESSAGE) {
        console.error('[Legion7TV] page storage message exceeds the allowed size');
        return;
    }
    let update;
    try {
        update = JSON.parse(event.detail);
    } catch (error) {
        console.error('[Legion7TV] invalid page storage message', error);
        return;
    }
    if (!update || !PAGE_STORE_KEY_SET.has(update.key)) return;
    store.set(update.key, update.value);
});

async function start() {
    try {
        if (!await initializeExtensionStore())
            throw new Error('browser extension storage API is unavailable');
        initialized = true;
        globalThis.__L7TV_EXTENSION_ISOLATED__ = true;
        globalThis.__L7TV_CSS_INJECTED__ = true;

        const api = globalThis.browser || globalThis.chrome;
        if (api && api.storage && api.storage.onChanged) {
            api.storage.onChanged.addListener((changes, area) => {
                if (area !== 'local') return;
                for (const [key, change] of Object.entries(changes)) {
                    if (change && Object.prototype.hasOwnProperty.call(change, 'newValue')) {
                        updateExtensionStore(key, change.newValue);
                        syncPageStore(key, change.newValue);
                    }
                }
            });
        }

        if (pageBridgeReady) {
            const snapshot = Object.fromEntries(PAGE_STORE_KEYS.map((key) => [key, store.get(key)]));
            dispatchJson(EVENTS.pageInit, snapshot);
        }
        await import('../../src/main.js');
    } catch (error) {
        console.error('[Legion7TV] extension startup failed', error);
    }
}

start();
