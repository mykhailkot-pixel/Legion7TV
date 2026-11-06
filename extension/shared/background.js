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
const DEFAULT_TIMEOUT = 15000;

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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || message.type !== 'LEGION7TV_FETCH') return false;
    const senderIsAllowed = sender.url === 'https://play.multidonate.ru'
        || (typeof sender.url === 'string' && sender.url.startsWith('https://play.multidonate.ru/'));
    if (!sender.tab || !senderIsAllowed) {
        sendResponse({ ok: false, error: 'request sender is not an allowed page' });
        return false;
    }

    fetchResource(message).then(
        (result) => sendResponse(result),
        (error) => sendResponse({ ok: false, error: String(error && error.message || error) })
    );
    return true;
});
