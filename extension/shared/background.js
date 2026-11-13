const ALLOWED_HOSTS = new Set([
    '7tv.io',
    'cdn.7tv.app',
    'api.ivr.fi',
    'ibb.co',
    'www.ibb.co',
    'imgbb.com',
    'www.imgbb.com',
    'i.ibb.co'
]);
const MAX_RESPONSE_BYTES = 12 * 1024 * 1024;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_IMAGE_BASE64_LENGTH = Math.ceil(MAX_IMAGE_BYTES / 3) * 4;
const DEFAULT_TIMEOUT = 15000;
const IMAGE_DB_NAME = 'legion7tv-image-cache';
const IMAGE_STORE_NAME = 'images';
let imageDatabasePromise;

function isAllowedUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && ALLOWED_HOSTS.has(url.hostname);
    } catch {
        return false;
    }
}

function encodeBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunkSize)
        binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
    return btoa(binary);
}

async function fetchResource(message) {
    if (!isAllowedUrl(message.url)) throw new Error('request URL is not allowed');
    if (message.responseType !== undefined && message.responseType !== 'blob')
        throw new Error('unsupported response type');

    const timeout = Number.isFinite(message.timeout)
        ? Math.max(1000, Math.min(message.timeout, 30000))
        : DEFAULT_TIMEOUT;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(message.url, {
            method: 'GET',
            credentials: 'omit',
            redirect: 'follow',
            signal: controller.signal
        });
        if (!isAllowedUrl(response.url)) throw new Error('redirect target is not allowed');
        if (!response.ok) throw new Error(`${message.url} -> ${response.status}`);
        const buffer = await response.arrayBuffer();
        if (buffer.byteLength > MAX_RESPONSE_BYTES)
            throw new Error(`response exceeds ${MAX_RESPONSE_BYTES} bytes`);

        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        const body = message.responseType === 'blob'
            ? encodeBase64(buffer)
            : new TextDecoder().decode(buffer);
        return { ok: true, status: response.status, contentType, body };
    } finally {
        clearTimeout(timer);
    }
}

function openImageDatabase() {
    if (!imageDatabasePromise) {
        imageDatabasePromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(IMAGE_DB_NAME, 1);
            request.onupgradeneeded = () => {
                if (!request.result.objectStoreNames.contains(IMAGE_STORE_NAME))
                    request.result.createObjectStore(IMAGE_STORE_NAME);
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => {
                imageDatabasePromise = null;
                reject(request.error || new Error('image cache database could not be opened'));
            };
            request.onblocked = () => {
                imageDatabasePromise = null;
                reject(new Error('image cache database upgrade is blocked'));
            };
        });
    }
    return imageDatabasePromise;
}

async function imageDatabaseTransaction(mode, operation) {
    const database = await openImageDatabase();
    return new Promise((resolve, reject) => {
        let result;
        try {
            const transaction = database.transaction(IMAGE_STORE_NAME, mode);
            const request = operation(transaction.objectStore(IMAGE_STORE_NAME));
            if (request) {
                request.onsuccess = () => { result = request.result; };
                request.onerror = () => reject(request.error || new Error('image cache request failed'));
            }
            transaction.oncomplete = () => resolve(result);
            transaction.onerror = transaction.onabort = () =>
                reject(transaction.error || new Error('image cache transaction failed'));
        } catch (error) {
            reject(error);
        }
    });
}

function decodeImageBase64(value, contentType) {
    if (typeof value !== 'string' || value.length > MAX_IMAGE_BASE64_LENGTH)
        throw new Error('image exceeds the 12 MiB cache limit');
    const binary = atob(value);
    if (binary.length > MAX_IMAGE_BYTES)
        throw new Error('image exceeds the 12 MiB cache limit');
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: contentType || 'application/octet-stream' });
}

function encodeImageBase64(blob) {
    const bytes = new Uint8Array(blob);
    let binary = '';
    const chunkSize = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunkSize)
        binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
    return btoa(binary);
}

async function handleImageCacheMessage(message) {
    if (message.type === 'IMG_GET') {
        if (typeof message.url !== 'string') throw new Error('image cache key is invalid');
        const blob = await imageDatabaseTransaction('readonly', (store) => store.get(message.url));
        if (!blob) return { ok: true, found: false };
        if (!(blob instanceof Blob) || blob.size > MAX_IMAGE_BYTES)
            throw new Error('cached image exceeds the 12 MiB limit');
        return {
            ok: true,
            found: true,
            contentType: blob.type || 'application/octet-stream',
            body: encodeImageBase64(await blob.arrayBuffer())
        };
    }

    if (message.type === 'IMG_PUT') {
        if (typeof message.url !== 'string') throw new Error('image cache key is invalid');
        const blob = decodeImageBase64(message.body, message.contentType);
        await imageDatabaseTransaction('readwrite', (store) => store.put(blob, message.url));
        return { ok: true };
    }

    await imageDatabaseTransaction('readwrite', (store) => store.clear());
    return { ok: true };
}

function isAllowedPageSender(sender) {
    const senderIsAllowed = sender.url === 'https://play.multidonate.ru'
        || (typeof sender.url === 'string' && sender.url.startsWith('https://play.multidonate.ru/'));
    return !!sender.tab && senderIsAllowed;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message) return false;
    if (message.type === 'LEGION7TV_FETCH') {
        if (!isAllowedPageSender(sender)) {
            sendResponse({ ok: false, error: 'request sender is not an allowed page' });
            return false;
        }

        fetchResource(message).then(
            (result) => sendResponse(result),
            (error) => sendResponse({ ok: false, error: String(error && error.message || error) })
        );
        return true;
    }
    if (!['IMG_GET', 'IMG_PUT', 'IMG_CLEAR'].includes(message.type)) return false;
    if (!isAllowedPageSender(sender)) {
        sendResponse({ ok: false, error: 'request sender is not an allowed page' });
        return false;
    }

    handleImageCacheMessage(message).then(
        (result) => sendResponse(result),
        (error) => sendResponse({ ok: false, error: String(error && error.message || error) })
    );
    return true;
});
