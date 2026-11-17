import { STORE } from '../../src/core/consts.js';
import {
    CHAT_THEME_VERSION,
    MAX_CHAT_THEME_ASSETS,
    MAX_CHAT_THEME_ASSET_BYTES,
    MAX_CHAT_THEME_TOTAL_BYTES,
    detectThemeImageType,
    encodeThemeImage,
    getThemeImageByteLength,
    isValidThemeAssetId,
    normalizeChatTheme,
    normalizeThemeImageUrl,
    readThemeImageDimensions
} from '../../src/chat/ui/themeAssets.js';

const api = globalThis.browser || globalThis.chrome;
const form = document.getElementById('asset-form');
const idInput = document.getElementById('asset-id');
const urlInput = document.getElementById('asset-url');
const downloadButton = document.getElementById('download');
const status = document.getElementById('status');
const assetsList = document.getElementById('assets');

function callApi(owner, methodName, args) {
    if (globalThis.browser) return owner[methodName](...args);
    return new Promise((resolve, reject) => {
        owner[methodName](...args, (result) => {
            const error = api.runtime.lastError;
            if (error) reject(new Error(error.message));
            else resolve(result);
        });
    });
}

async function getStoredTheme() {
    const values = await callApi(api.storage.local, 'get', [[STORE.chatTheme, STORE.chatCustomCss]]);
    if (values[STORE.chatTheme] !== undefined)
        return normalizeChatTheme(values[STORE.chatTheme]);
    return normalizeChatTheme({
        version: CHAT_THEME_VERSION,
        css: typeof values[STORE.chatCustomCss] === 'string' ? values[STORE.chatCustomCss] : '',
        assets: {}
    });
}

async function saveTheme(theme) {
    await callApi(api.storage.local, 'set', [{ [STORE.chatTheme]: theme }]);
}

async function readImageResponse(response) {
    const contentLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > MAX_CHAT_THEME_ASSET_BYTES)
        throw new Error('Изображение больше 2 МиБ.');
    if (!response.body) {
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (bytes.length > MAX_CHAT_THEME_ASSET_BYTES) throw new Error('Изображение больше 2 МиБ.');
        return bytes;
    }

    const reader = response.body.getReader();
    const chunks = [];
    let totalBytes = 0;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            totalBytes += value.byteLength;
            if (totalBytes > MAX_CHAT_THEME_ASSET_BYTES) {
                await reader.cancel();
                throw new Error('Изображение больше 2 МиБ.');
            }
            chunks.push(value);
        }
    } finally {
        reader.releaseLock();
    }

    const bytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return bytes;
}

async function fetchThemeImage(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
        const response = await fetch(url.href, {
            method: 'GET',
            credentials: 'omit',
            cache: 'no-store',
            redirect: 'follow',
            referrerPolicy: 'no-referrer',
            signal: controller.signal
        });
        if (new URL(response.url).origin !== url.origin)
            throw new Error('Ссылка перенаправила на другой домен; такие перенаправления запрещены.');
        if (!response.ok) throw new Error(`Сервер вернул HTTP ${response.status}.`);
        const declaredType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
        const bytes = await readImageResponse(response);
        const mime = detectThemeImageType(bytes);
        if (!mime) throw new Error('По ссылке нет PNG, JPEG или WebP изображения.');
        const dimensions = readThemeImageDimensions(bytes, mime);
        if (dimensions.width > 4096 || dimensions.height > 4096
            || dimensions.width * dimensions.height > 16_000_000)
            throw new Error('Размер изображения должен быть не больше 4096 × 4096 и 16 Мп.');
        if (declaredType && declaredType !== 'application/octet-stream' && declaredType !== mime
            && !(mime === 'image/jpeg' && declaredType === 'image/jpg'))
            throw new Error('Тип ответа сервера не совпадает с форматом изображения.');

        const bitmap = await createImageBitmap(new Blob([bytes], { type: mime }));
        const { width, height } = bitmap;
        bitmap.close();
        if (width !== dimensions.width || height !== dimensions.height)
            throw new Error('Размеры изображения не совпадают с его заголовком.');
        return { mime, data: encodeThemeImage(bytes), width, height, byteLength: bytes.length };
    } finally {
        clearTimeout(timer);
    }
}

function setStatus(message) {
    status.textContent = message;
}

function renderAssets(theme) {
    assetsList.replaceChildren();
    const entries = Object.entries(theme.assets);
    if (!entries.length) {
        const empty = document.createElement('div');
        empty.className = 'empty';
        empty.textContent = 'Пока нет изображений.';
        assetsList.appendChild(empty);
        return;
    }

    for (const [id, asset] of entries) {
        const row = document.createElement('div');
        row.className = 'asset';
        const name = document.createElement('span');
        name.className = 'asset-name';
        name.textContent = `${id} · ${asset.mime} · ${Math.ceil(getThemeImageByteLength(asset.data) / 1024)} КиБ`;
        const copy = document.createElement('button');
        copy.type = 'button';
        copy.textContent = 'Скопировать ссылку';
        copy.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(`url("t7-asset:${id}")`);
                setStatus(`Ссылка для «${id}» скопирована.`);
            } catch (error) {
                setStatus(`Не удалось скопировать: ${error.message}`);
            }
        });
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.textContent = 'Удалить';
        remove.addEventListener('click', async () => {
            try {
                const nextTheme = await getStoredTheme();
                const referencedIds = [...nextTheme.css.matchAll(/t7-asset:([a-z0-9][a-z0-9_-]{0,31})/gi)]
                    .map((match) => match[1].toLowerCase());
                if (referencedIds.includes(id))
                    throw new Error(`CSS использует «${id}». Сначала уберите эту ссылку из CSS темы.`);
                delete nextTheme.assets[id];
                await saveTheme(nextTheme);
                setStatus(`Изображение «${id}» удалено.`);
                renderAssets(nextTheme);
            } catch (error) {
                setStatus(`Не удалось удалить изображение: ${error.message}`);
            }
        });
        row.append(name, copy, remove);
        assetsList.appendChild(row);
    }
}

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!api || !api.permissions || !api.storage)
        return setStatus('API расширения недоступен. Перезагрузите расширение и страницу.');

    const id = idInput.value.trim().toLowerCase();
    if (!isValidThemeAssetId(id))
        return setStatus('ID: латинские буквы, цифры, дефис или подчёркивание; первый символ — буква или цифра.');

    downloadButton.disabled = true;
    try {
        const url = normalizeThemeImageUrl(urlInput.value);
        setStatus(`Запрашиваю разрешение для ${url.host}…`);
        const permissionPattern = `https://${url.hostname}/*`;
        const granted = await callApi(api.permissions, 'request', [{ origins: [permissionPattern] }]);
        if (!granted) throw new Error(`Разрешение для ${url.host} не предоставлено.`);

        setStatus('Загружаю и проверяю изображение…');
        const image = await fetchThemeImage(url);
        const theme = await getStoredTheme();
        const existingBytes = Object.entries(theme.assets)
            .filter(([assetId]) => assetId !== id)
            .reduce((sum, [, asset]) => sum + getThemeImageByteLength(asset.data), 0);
        if (!Object.hasOwn(theme.assets, id) && Object.keys(theme.assets).length >= MAX_CHAT_THEME_ASSETS)
            throw new Error(`В теме может быть не больше ${MAX_CHAT_THEME_ASSETS} изображений.`);
        if (existingBytes + image.byteLength > MAX_CHAT_THEME_TOTAL_BYTES)
            throw new Error('Общий размер изображений темы не должен превышать 8 МиБ.');

        theme.assets[id] = {
            mime: image.mime,
            data: image.data,
            width: image.width,
            height: image.height
        };
        const normalizedTheme = normalizeChatTheme(theme);
        await saveTheme(normalizedTheme);
        idInput.value = '';
        urlInput.value = '';
        setStatus(`Изображение «${id}» сохранено. В CSS используйте url("t7-asset:${id}").`);
        renderAssets(normalizedTheme);
    } catch (error) {
        setStatus(error instanceof Error ? error.message : String(error));
    } finally {
        downloadButton.disabled = false;
    }
});

getStoredTheme().then(renderAssets).catch((error) => {
    setStatus(`Не удалось прочитать тему: ${error.message}`);
});
