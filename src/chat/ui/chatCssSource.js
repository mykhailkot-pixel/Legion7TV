const MAX_CHAT_CSS_URL_LENGTH = 2048;
const MAX_CHAT_CSS_BYTES = 100 * 1024;
const MAX_FETCH_TIMEOUT = 15000;
export const CHAT_THEME_CATALOG_URL = 'https://raw.githubusercontent.com/mykhailkot-pixel/legion7tv-themes/main/catalog.json';
export const CHAT_THEME_CATALOG_FALLBACK_URL = 'https://cdn.jsdelivr.net/gh/mykhailkot-pixel/legion7tv-themes@main/catalog.json';
const MAX_CHAT_THEMES = 100;
const CHAT_THEME_REPOSITORY_PATH = '/gh/mykhailkot-pixel/legion7tv-themes@';

export function filterChatThemes(themes, query) {
    const normalizedQuery = String(query || '').trim().toLocaleLowerCase();
    if (!normalizedQuery) return themes;
    return themes.filter((theme) => [
        theme.name,
        theme.author,
        theme.description,
        ...theme.tags
    ].join(' ').toLocaleLowerCase().includes(normalizedQuery));
}

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

function validateChatTheme(value, ids) {
    if (!value || typeof value !== 'object' || Array.isArray(value)
        || typeof value.id !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,63}$/i.test(value.id)
        || ids.has(value.id)
        || typeof value.name !== 'string' || !value.name.trim() || value.name.length > 100
        || typeof value.author !== 'string' || value.author.length > 80
        || typeof value.version !== 'string' || value.version.length > 40
        || typeof value.description !== 'string' || value.description.length > 500
        || !Array.isArray(value.tags) || value.tags.length > 20
        || value.tags.some((tag) => typeof tag !== 'string' || tag.length > 32))
        throw new Error('В каталоге есть тема с некорректными данными.');

    const css = validateThemeAssetUrl(value.css, /\.css$/);
    const preview = typeof value.preview === 'string' && value.preview.trim()
        ? validateThemeAssetUrl(value.preview, /\.(?:png|jpe?g|gif|webp)$/i)
        : '';
    ids.add(value.id);

    return {
        id: value.id,
        name: value.name.trim(),
        author: value.author.trim(),
        version: value.version.trim(),
        description: value.description.trim(),
        tags: value.tags.map((tag) => tag.trim()).filter(Boolean),
        license: typeof value.license === 'string' ? value.license.slice(0, 40) : '',
        css,
        preview
    };
}

function validateChatThemeCatalog(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)
        || ![1, 2].includes(value.schemaVersion) || !Array.isArray(value.themes)
        || value.themes.length > MAX_CHAT_THEMES)
        throw new Error('Каталог тем имеет неподдерживаемый формат.');

    const ids = new Set();
    const themes = [];
    let skippedCount = 0;
    for (const entry of value.themes) {
        try {
            themes.push(validateChatTheme(entry, ids));
        } catch {
            skippedCount += 1;
        }
    }
    return { themes, skippedCount };
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
    const { themes, skippedCount } = validateChatThemeCatalog(catalog);
    const warnings = [];
    if (typeof result.warning === 'string' && result.warning.trim())
        warnings.push(result.warning.slice(0, 300));
    if (skippedCount)
        warnings.push(`Пропущено тем с некорректными данными: ${skippedCount}.`);
    return { themes, warning: warnings.join(' ') };
}
