import { configureExtensionStore, updateExtensionStore } from '../../src/core/store.js';

const EVENTS = {
    pageReady: 'l7tv:extension-page-ready',
    pageInit: 'l7tv:extension-page-init',
    storeWrite: 'l7tv:extension-store-write',
    storeUpdate: 'l7tv:extension-store-update'
};
let started = false;
let pingSystem = null;

const parseDetail = (event) => {
    if (event.target !== window || typeof event.detail !== 'string') return null;
    try {
        return JSON.parse(event.detail);
    } catch (error) {
        console.error('[Legion7TV] invalid extension bridge message', error);
        return null;
    }
};

window.addEventListener(EVENTS.pageInit, async (event) => {
    if (started) return;
    const snapshot = parseDetail(event);
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return;
    started = true;
    configureExtensionStore(snapshot, (key, value) => {
        window.dispatchEvent(new CustomEvent(EVENTS.storeWrite, {
            detail: JSON.stringify({ key, value })
        }));
    });
    globalThis.__L7TV_EXTENSION_PAGE__ = true;

    try {
        ({ pingSystem } = await import('../../src/chat/pingSystem.js'));
        await import('../../src/chat/minetabs.js');
    } catch (error) {
        started = false;
        console.error('[Legion7TV] page bridge startup failed', error);
    }
});

window.addEventListener(EVENTS.storeUpdate, (event) => {
    const update = parseDetail(event);
    if (!update || typeof update.key !== 'string'
        || !Object.prototype.hasOwnProperty.call(update, 'value')) return;
    updateExtensionStore(update.key, update.value);
    if (update.key === 't7ping' && pingSystem) pingSystem.reloadConfig();
});

window.dispatchEvent(new Event(EVENTS.pageReady));
