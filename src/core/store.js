let extensionValues = null;
let extensionWriter = null;
let extensionPersistenceUnavailable = false;

function logStorageError(operation, error) {
    console.error(`[Legion7TV] storage ${operation} failed`, error);
}

function handleExtensionWriteError(error) {
    if (error instanceof Error && /extension context invalidated/i.test(error.message)) {
        extensionWriter = null;
        extensionPersistenceUnavailable = true;
        console.warn('[Legion7TV] The extension was reloaded; storage changes will not persist until this page is refreshed.', error);
        return;
    }
    logStorageError('write', error);
}

export function configureExtensionStore(values, writer) {
    extensionValues = values && typeof values === 'object' ? { ...values } : {};
    extensionWriter = typeof writer === 'function' ? writer : null;
    extensionPersistenceUnavailable = false;
}

export function updateExtensionStore(key, value) {
    if (!extensionValues) return;
    extensionValues[key] = value;
}

export async function initializeExtensionStore() {
    const api = globalThis.browser || globalThis.chrome;
    if (!api || !api.storage || !api.storage.local) return false;

    try {
        let values;
        if (globalThis.browser) {
            values = await api.storage.local.get(null);
        } else {
            values = await api.storage.local.get(null);
        }
        configureExtensionStore(values, (key, value) => {
            return api.storage.local.set({ [key]: value });
        });
        return true;
    } catch (error) {
        logStorageError('initialization', error);
        throw error;
    }
}

export const store = {
    get(key) {
        if (extensionValues) return extensionValues[key];
        try {
            return typeof GM_getValue === 'function' ? GM_getValue(key, undefined) : undefined;
        } catch (error) {
            logStorageError('read', error);
            return undefined;
        }
    },
    set(key, value) {
        if (extensionValues) {
            extensionValues[key] = value;
            if (!extensionWriter) {
                if (extensionPersistenceUnavailable) return;
                logStorageError('write', new Error('extension storage writer is not configured'));
                return;
            }
            try {
                Promise.resolve(extensionWriter(key, value)).catch(handleExtensionWriteError);
            } catch (error) {
                handleExtensionWriteError(error);
            }
            return;
        }
        try {
            if (typeof GM_setValue !== 'function') throw new Error('GM_setValue is unavailable');
            GM_setValue(key, value);
        } catch (error) {
            logStorageError('write', error);
        }
    }
};