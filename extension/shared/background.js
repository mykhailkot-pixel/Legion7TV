import {
    CHAT_THEME_CATALOG_FALLBACK_URL,
    CHAT_THEME_CATALOG_URL,
    validateChatCssUrl
} from '../../src/chat/ui/chatCssSource.js';
import {
    buildDetachedChatUrl,
    getChatWindowScope,
    isDetachedChatUrl,
    shouldSuppressPingSound
} from '../../src/chat/ui/chatWindow.js';

const ALLOWED_HOSTS = new Set([
    '7tv.io',
    'cdn.7tv.app',
    'api.ivr.fi',
    'ibb.co',
    'www.ibb.co',
    'imgbb.com',
    'www.imgbb.com',
    'i.ibb.co',
    'cdn.jsdelivr.net'
]);
const MAX_RESPONSE_BYTES = 12 * 1024 * 1024;
const MAX_CHAT_CSS_BYTES = 100 * 1024;
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
    const responseLimit = Number.isSafeInteger(message.maxBytes)
        ? Math.min(MAX_RESPONSE_BYTES, Math.max(1, message.maxBytes))
        : MAX_RESPONSE_BYTES;
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
        if (buffer.byteLength > responseLimit)
            throw new Error(`response exceeds ${responseLimit} bytes`);

        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        const body = message.responseType === 'blob'
            ? encodeBase64(buffer)
            : new TextDecoder().decode(buffer);
        return { ok: true, status: response.status, contentType, body };
    } finally {
        clearTimeout(timer);
    }
}

async function readLimitedResponseText(response, maxBytes, errorMessage) {
    const contentLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > maxBytes)
        throw new Error(errorMessage);

    if (!response.body || typeof response.body.getReader !== 'function') {
        const buffer = await response.arrayBuffer();
        if (buffer.byteLength > maxBytes) throw new Error(errorMessage);
        return new TextDecoder().decode(buffer);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let byteLength = 0;
    let text = '';
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            byteLength += value.byteLength;
            if (byteLength > maxBytes) {
                await reader.cancel();
                throw new Error(errorMessage);
            }
            text += decoder.decode(value, { stream: true });
        }
        return text + decoder.decode();
    } finally {
        reader.releaseLock();
    }
}

async function fetchChatCssResource(message) {
    let url;
    try {
        url = validateChatCssUrl(message.url);
    } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Некорректная ссылка на CSS.');
    }

    const timeout = Number.isFinite(message.timeout)
        ? Math.max(1000, Math.min(message.timeout, 30000))
        : DEFAULT_TIMEOUT;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'omit',
            redirect: 'error',
            signal: controller.signal
        });
        try {
            validateChatCssUrl(response.url);
        } catch {
            throw new Error('Ссылка перенаправила на недопустимый адрес.');
        }
        if (!response.ok)
            throw new Error(`Не удалось загрузить CSS: сервер ответил ${response.status}.`);

        const body = await readLimitedResponseText(
            response,
            MAX_CHAT_CSS_BYTES,
            'CSS-файл не должен быть больше 100 КиБ.'
        );

        if (!body.trim()) throw new Error('CSS-файл пустой.');
        return { ok: true, status: response.status, body };
    } finally {
        clearTimeout(timer);
    }
}

async function fetchChatCssCatalogResource(message) {
    const timeout = Number.isFinite(message.timeout)
        ? Math.max(1000, Math.min(message.timeout, 30000))
        : DEFAULT_TIMEOUT;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
        let response;
        let catalogUrl = CHAT_THEME_CATALOG_URL;
        let warning = '';
        try {
            response = await fetch(catalogUrl, {
                method: 'GET',
                credentials: 'omit',
                redirect: 'error',
                cache: 'no-cache',
                signal: controller.signal
            });
            if (response.url !== catalogUrl)
                throw new Error('Адрес каталога тем изменился при загрузке.');
            if (!response.ok)
                throw new Error(`Сервер ответил ${response.status}.`);
        } catch (error) {
            if (controller.signal.aborted) throw error;
            catalogUrl = CHAT_THEME_CATALOG_FALLBACK_URL;
            warning = `Каталог загружен через jsDelivr, так как GitHub Raw недоступен (${String(error && error.message || error).slice(0, 160)}).`;
            response = await fetch(catalogUrl, {
                method: 'GET',
                credentials: 'omit',
                redirect: 'error',
                signal: controller.signal
            });
            if (response.url !== catalogUrl)
                throw new Error('Адрес резервного каталога тем изменился при загрузке.');
            if (!response.ok)
                throw new Error(`Не удалось загрузить каталог тем: сервер ответил ${response.status}.`);
        }

        const body = await readLimitedResponseText(
            response,
            MAX_CHAT_CSS_BYTES,
            'Каталог тем не должен быть больше 100 КиБ.'
        );
        if (!body.trim()) throw new Error('Каталог тем пустой.');
        return { ok: true, status: response.status, body, warning };
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
            if (Array.isArray(request)) {
                const results = new Array(request.length);
                request.forEach((item, index) => {
                    item.onsuccess = () => { results[index] = item.result; };
                    item.onerror = () => reject(item.error || new Error('image cache request failed'));
                });
                transaction.oncomplete = () => resolve(results);
            } else if (request) {
                request.onsuccess = () => { result = request.result; };
                request.onerror = () => reject(request.error || new Error('image cache request failed'));
                transaction.oncomplete = () => resolve(result);
            } else {
                transaction.oncomplete = () => resolve(result);
            }
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
        const urls = Array.isArray(message.urls) ? message.urls : [message.url];
        if (!urls.length || urls.length > 8
            || urls.some((url) => typeof url !== 'string' || !isAllowedUrl(url)))
            throw new Error('image cache key is invalid');
        const blobs = await imageDatabaseTransaction('readonly', (store) =>
            urls.map((url) => store.get(url)));
        const blob = blobs.find(Boolean);
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

    if (message.type === 'IMG_GET_BATCH') {
        if (!Array.isArray(message.requests) || !message.requests.length
            || message.requests.length > 3
            || message.requests.some((request) => !request || !Array.isArray(request.urls)
                || !request.urls.length || request.urls.length > 8
                || request.urls.some((url) => typeof url !== 'string' || !isAllowedUrl(url))))
            throw new Error('image cache batch is invalid');
        const urls = [...new Set(message.requests.flatMap((request) => request.urls))];
        const blobs = await imageDatabaseTransaction('readonly', (store) =>
            urls.map((url) => store.get(url)));
        const cached = new Map(urls.map((url, index) => [url, blobs[index]]));
        const results = [];
        for (const request of message.requests) {
            const blob = request.urls.map((url) => cached.get(url)).find(Boolean);
            if (!blob) {
                results.push({ found: false });
                continue;
            }
            if (!(blob instanceof Blob) || blob.size > MAX_IMAGE_BYTES)
                throw new Error('cached image exceeds the 12 MiB limit');
            results.push({
                found: true,
                contentType: blob.type || 'application/octet-stream',
                body: encodeImageBase64(await blob.arrayBuffer())
            });
        }
        return { ok: true, results };
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
    const senderIsAllowed = sender.url === 'https://legiongame.gg'
        || (typeof sender.url === 'string' && sender.url.startsWith('https://legiongame.gg/'));
    return !!sender.tab && senderIsAllowed;
}

function getChatWindowStatus(sender, sendResponse) {
    if (!isAllowedPageSender(sender)) {
        sendResponse({ ok: false, error: 'Источник запроса не разрешён.' });
        return false;
    }

    const scope = getChatWindowScope(sender.url);
    if (!scope) {
        sendResponse({ ok: false, error: 'Не удалось определить адрес чата.' });
        return false;
    }
    if (isDetachedChatUrl(sender.url)) {
        sendResponse({ ok: true, suppressSound: false });
        return false;
    }

    chrome.tabs.query({ url: 'https://legiongame.gg/*' }, (openTabs) => {
        const error = chrome.runtime.lastError;
        if (error) {
            sendResponse({ ok: false, error: error.message || 'Не удалось найти открытые чаты.' });
            return;
        }

        const suppressSound = shouldSuppressPingSound(
            sender.url,
            (openTabs || []).map((tab) => tab.url || tab.pendingUrl || '')
        );
        sendResponse({ ok: true, suppressSound });
    });
    return true;
}

function relayChatRead(message, sender, sendResponse) {
    const tabs = new Set(['g', 'tr', 'mn', 'dm', 'gl', 'lg']);
    if (!isAllowedPageSender(sender)
        || !tabs.has(message.tab)
        || !Array.isArray(message.ids)
        || message.ids.length > 1000
        || message.ids.some((id) => typeof id !== 'string' || !id || id.length > 200)) {
        sendResponse({ ok: false, error: 'Данные прочитанного сообщения некорректны.' });
        return false;
    }

    const scope = getChatWindowScope(sender.url);
    if (!scope) {
        sendResponse({ ok: false, error: 'Не удалось определить чат для синхронизации.' });
        return false;
    }

    chrome.tabs.query({ url: 'https://legiongame.gg/*' }, (openTabs) => {
        const queryError = chrome.runtime.lastError;
        if (queryError) {
            sendResponse({ ok: false, error: queryError.message || 'Не удалось найти открытые чаты.' });
            return;
        }

        const payload = {
            type: 'LEGION7TV_CHAT_READ',
            scope,
            tab: message.tab,
            ids: [...new Set(message.ids)]
        };
        for (const tab of openTabs || []) {
            if (tab.id == null || tab.id === sender.tab.id) continue;
            chrome.tabs.sendMessage(tab.id, payload, () => {
                void chrome.runtime.lastError;
            });
        }
        sendResponse({ ok: true });
    });
    return true;
}

function openChatWindow(message, sender, sendResponse) {
    if (!isAllowedPageSender(sender)) {
        sendResponse({ ok: false, error: 'Источник запроса не разрешён.' });
        return false;
    }

    let url;
    try {
        url = buildDetachedChatUrl(message.url);
    } catch (error) {
        sendResponse({ ok: false, error: String(error && error.message || error) });
        return false;
    }

    if (!chrome.windows || typeof chrome.windows.create !== 'function') {
        sendResponse({ ok: false, error: 'Браузер не поддерживает отдельные окна расширения.' });
        return false;
    }

    try {
        chrome.windows.create({
            url,
            type: 'popup',
            width: 440,
            height: 720,
            focused: true
        }, (openedWindow) => {
            const error = chrome.runtime.lastError;
            if (error) {
                sendResponse({ ok: false, error: error.message || 'Не удалось создать окно чата.' });
                return;
            }
            if (!openedWindow) {
                sendResponse({ ok: false, error: 'Браузер не создал окно чата.' });
                return;
            }
            sendResponse({ ok: true });
        });
    } catch (error) {
        sendResponse({ ok: false, error: String(error && error.message || error) });
        return false;
    }
    return true;
}

function openChatWindowFromAction(tab) {
    const value = tab && (tab.url || tab.pendingUrl);
    if (!value || tab.id == null) return;

    let url;
    try {
        url = new URL(value);
    } catch {
        return;
    }
    if (url.origin !== 'https://legiongame.gg') return;

    const pageUrl = url.href;
    openChatWindow(
        { url: pageUrl },
        { url: pageUrl, tab },
        (result) => {
            if (!result || !result.ok) {
                console.warn('[Legion7TV] Не удалось открыть отдельное окно чата', result?.error || 'неизвестная ошибка');
            }
        }
    );
}

const extensionAction = globalThis.browser?.action
    || globalThis.chrome?.action
    || globalThis.browser?.browserAction
    || globalThis.chrome?.browserAction;
extensionAction?.onClicked?.addListener(openChatWindowFromAction);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message) return false;
    if (message.type === 'LEGION7TV_CHAT_WINDOW_STATUS')
        return getChatWindowStatus(sender, sendResponse);
    if (message.type === 'LEGION7TV_CHAT_READ')
        return relayChatRead(message, sender, sendResponse);
    if (message.type === 'LEGION7TV_OPEN_CHAT_WINDOW')
        return openChatWindow(message, sender, sendResponse);

    if (message.type === 'LEGION7TV_FETCH_CHAT_CSS_CATALOG') {
        if (!isAllowedPageSender(sender)) {
            sendResponse({ ok: false, error: 'Источник запроса не разрешён.' });
            return false;
        }

        fetchChatCssCatalogResource(message).then(
            (result) => sendResponse(result),
            (error) => sendResponse({ ok: false, error: String(error && error.message || error) })
        );
        return true;
    }
    if (message.type === 'LEGION7TV_FETCH_CHAT_CSS') {
        if (!isAllowedPageSender(sender)) {
            sendResponse({ ok: false, error: 'Источник запроса не разрешён.' });
            return false;
        }

        fetchChatCssResource(message).then(
            (result) => sendResponse(result),
            (error) => sendResponse({ ok: false, error: String(error && error.message || error) })
        );
        return true;
    }
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
    if (!['IMG_GET', 'IMG_GET_BATCH', 'IMG_PUT', 'IMG_CLEAR'].includes(message.type)) return false;
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
