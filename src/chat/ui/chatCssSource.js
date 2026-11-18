const MAX_CHAT_CSS_URL_LENGTH = 2048;
const MAX_CHAT_CSS_BYTES = 100 * 1024;
const MAX_FETCH_TIMEOUT = 15000;
export const CHAT_THEME_CATALOG_URL = 'https://cdn.jsdelivr.net/gh/mykhailkot-pixel/legion7tv-themes@main/catalog.json';
export const CHAT_THEME_CATALOG_FALLBACK_URL = 'https://raw.githubusercontent.com/mykhailkot-pixel/legion7tv-themes/main/catalog.json';
const MAX_CHAT_THEMES = 100;
const CHAT_THEME_REPOSITORY_PATH = '/gh/mykhailkot-pixel/legion7tv-themes@';

export function validateChatCssUrl(value) {
    if (typeof value !== 'string' || value.length > MAX_CHAT_CSS_URL_LENGTH)
        throw new Error('Вставьте прямую ссылку на CSS-файл jsDelivr длиной до 2048 символов.');

    const rawUrl = value.trim();
    if (rawUrl.includes('\\') || /\/\.{1,2}(?:\/|[?#]|$)/.test(rawUrl))
        throw new Error('Ссылка на CSS содержит недопустимый сегмент пути.');

    let url;
    try {
        url = new URL(rawUrl);
    } catch {
        throw new Error('Введите корректную HTTPS-ссылку на CSS-файл jsDelivr.');
    }

    if (url.protocol !== 'https:' || url.hostname !== 'cdn.jsdelivr.net'
        || url.username || url.password || url.port || url.search || url.hash)
        throw new Error('Разрешены только прямые HTTPS-ссылки без параметров с cdn.jsdelivr.net.');

    const pathPattern = /^\/gh\/[A-Za-z0-9][A-Za-z0-9._-]{0,38}\/[A-Za-z0-9._-]+(?:@[A-Za-z0-9._-]+)?\/(?:[A-Za-z0-9._~-]+\/)*[A-Za-z0-9._~-]+\.css$/;
    if (!pathPattern.test(url.pathname))
        throw new Error('Ожидается ссылка вида https://cdn.jsdelivr.net/gh/OWNER/REPO@VERSION/path/theme.css.');

    return url.href;
}

export async function fetchChatCssFromUrl(value) {
    const url = validateChatCssUrl(value);
    const api = globalThis.browser || globalThis.chrome;
    if (!api || !api.runtime || typeof api.runtime.sendMessage !== 'function')
        throw new Error('API расширения недоступно. Перезагрузите страницу и попробуйте снова.');

    const result = await api.runtime.sendMessage({
        type: 'LEGION7TV_FETCH_CHAT_CSS',
        url,
        timeout: MAX_FETCH_TIMEOUT
    });
    if (!result || !result.ok)
        throw new Error(result && result.error || 'Не удалось загрузить CSS по ссылке.');
    if (typeof result.body !== 'string')
        throw new Error('Сервер вернул некорректный CSS-файл.');
    if (new TextEncoder().encode(result.body).byteLength > MAX_CHAT_CSS_BYTES)
        throw new Error('CSS-файл не должен быть больше 100 КиБ.');
    if (!result.body.trim())
        throw new Error('CSS-файл пустой.');

    return result.body;
}

function validateThemeAssetUrl(value, extensionPattern) {
    if (typeof value !== 'string' || value.length > MAX_CHAT_CSS_URL_LENGTH)
        throw new Error('В каталоге указана некорректная ссылка на файл темы.');

    let url;
    try {
        url = new URL(value);
    } catch {
        throw new Error('В каталоге указана некорректная ссылка на файл темы.');
    }

    if (url.protocol !== 'https:' || url.hostname !== 'cdn.jsdelivr.net'
        || url.username || url.password || url.port || url.search || url.hash
        || !url.pathname.toLowerCase().startsWith(CHAT_THEME_REPOSITORY_PATH.toLowerCase())
        || !extensionPattern.test(url.pathname))
        throw new Error('Файлы темы должны находиться в репозитории каталога на jsDelivr.');

    return url.href;
}

function validateChatThemeCatalog(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)
        || value.schemaVersion !== 1 || !Array.isArray(value.themes)
        || value.themes.length > MAX_CHAT_THEMES)
        throw new Error('Каталог тем имеет неподдерживаемый формат.');

    const ids = new Set();
    return value.themes.map((theme) => {
        if (!theme || typeof theme !== 'object' || Array.isArray(theme)
            || typeof theme.id !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,63}$/i.test(theme.id)
            || ids.has(theme.id)
            || typeof theme.name !== 'string' || !theme.name.trim() || theme.name.length > 100
            || typeof theme.author !== 'string' || theme.author.length > 80
            || typeof theme.version !== 'string' || theme.version.length > 40
            || typeof theme.description !== 'string' || theme.description.length > 500
            || !Array.isArray(theme.tags) || theme.tags.length > 20
            || theme.tags.some((tag) => typeof tag !== 'string' || tag.length > 32))
            throw new Error('В каталоге есть тема с некорректными данными.');

        ids.add(theme.id);
        const css = validateThemeAssetUrl(theme.css, /\.css$/);
        const preview = typeof theme.preview === 'string' && theme.preview.trim()
            ? validateThemeAssetUrl(theme.preview, /\.(?:png|jpe?g|gif|webp)$/i)
            : '';

        return {
            id: theme.id,
            name: theme.name.trim(),
            author: theme.author.trim(),
            version: theme.version.trim(),
            description: theme.description.trim(),
            tags: theme.tags.map((tag) => tag.trim()).filter(Boolean),
            license: typeof theme.license === 'string' ? theme.license.slice(0, 40) : '',
            css,
            preview
        };
    });
}

export async function fetchChatThemeCatalog() {
    const api = globalThis.browser || globalThis.chrome;
    if (!api || !api.runtime || typeof api.runtime.sendMessage !== 'function')
        throw new Error('API расширения недоступно. Перезагрузите страницу и попробуйте снова.');

    const result = await api.runtime.sendMessage({
        type: 'LEGION7TV_FETCH_CHAT_CSS_CATALOG',
        timeout: MAX_FETCH_TIMEOUT
    });
    if (!result || !result.ok)
        throw new Error(result && result.error || 'Не удалось загрузить каталог тем.');
    if (typeof result.body !== 'string')
        throw new Error('Сервер вернул некорректный каталог тем.');
    if (new TextEncoder().encode(result.body).byteLength > MAX_CHAT_CSS_BYTES)
        throw new Error('Каталог тем не должен быть больше 100 КиБ.');

    let catalog;
    try {
        catalog = JSON.parse(result.body);
    } catch {
        throw new Error('Каталог тем содержит некорректный JSON.');
    }
    return {
        themes: validateChatThemeCatalog(catalog),
        warning: typeof result.warning === 'string' ? result.warning.slice(0, 300) : ''
    };
}
