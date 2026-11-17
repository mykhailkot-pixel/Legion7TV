export const CHAT_THEME_VERSION = 1;
export const MAX_CHAT_THEME_ASSETS = 8;
export const MAX_CHAT_THEME_ASSET_BYTES = 2 * 1024 * 1024;
export const MAX_CHAT_THEME_TOTAL_BYTES = 8 * 1024 * 1024;
export const MAX_CHAT_THEME_CSS_LENGTH = 100 * 1024;

const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const ASSET_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,31}$/;

export function isValidThemeAssetId(value) {
    return typeof value === 'string' && ASSET_ID_PATTERN.test(value);
}

export function detectThemeImageType(bytes) {
    if (bytes.length >= 8
        && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
        && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a)
        return 'image/png';
    if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
        return 'image/jpeg';
    if (bytes.length >= 12
        && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
        && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50)
        return 'image/webp';
    return '';
}

function readBigEndian16(bytes, index) {
    return (bytes[index] << 8) | bytes[index + 1];
}

function readBigEndian32(bytes, index) {
    return (bytes[index] * 0x1000000)
        + (bytes[index + 1] << 16)
        + (bytes[index + 2] << 8)
        + bytes[index + 3];
}

function readLittleEndian24(bytes, index) {
    return bytes[index] | (bytes[index + 1] << 8) | (bytes[index + 2] << 16);
}

function readJpegDimensions(bytes) {
    let index = 2;
    while (index < bytes.length) {
        if (bytes[index] !== 0xff) {
            index += 1;
            continue;
        }
        while (bytes[index] === 0xff) index += 1;
        const marker = bytes[index++];
        if (marker === 0xd8 || marker === 0xd9 || marker === 0x01
            || (marker >= 0xd0 && marker <= 0xd7))
            continue;
        if (index + 1 >= bytes.length) break;
        const segmentLength = readBigEndian16(bytes, index);
        if (segmentLength < 2 || index + segmentLength > bytes.length) break;
        if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker))
            return { height: readBigEndian16(bytes, index + 3), width: readBigEndian16(bytes, index + 5) };
        index += segmentLength;
    }
    return null;
}

export function readThemeImageDimensions(bytes, mime) {
    let dimensions = null;
    if (mime === 'image/png' && bytes.length >= 24
        && bytes[12] === 0x49 && bytes[13] === 0x48 && bytes[14] === 0x44 && bytes[15] === 0x52) {
        dimensions = { width: readBigEndian32(bytes, 16), height: readBigEndian32(bytes, 20) };
    } else if (mime === 'image/jpeg') {
        dimensions = readJpegDimensions(bytes);
    } else if (mime === 'image/webp' && bytes.length >= 25) {
        const chunkType = String.fromCharCode(...bytes.subarray(12, 16));
        if (chunkType === 'VP8X' && bytes.length >= 30) {
            dimensions = {
                width: readLittleEndian24(bytes, 24) + 1,
                height: readLittleEndian24(bytes, 27) + 1
            };
        } else if (chunkType === 'VP8 ' && bytes.length >= 30
            && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
            dimensions = {
                width: (bytes[26] | (bytes[27] << 8)) & 0x3fff,
                height: (bytes[28] | (bytes[29] << 8)) & 0x3fff
            };
        } else if (chunkType === 'VP8L' && bytes[20] === 0x2f) {
            dimensions = {
                width: 1 + ((bytes[22] & 0x3f) << 8) + bytes[21],
                height: 1 + ((bytes[24] & 0x0f) << 10) + (bytes[23] << 2) + ((bytes[22] & 0xc0) >> 6)
            };
        }
    }
    if (!dimensions || !dimensions.width || !dimensions.height)
        throw new Error('Не удалось определить размеры изображения.');
    return dimensions;
}

export function encodeThemeImage(bytes) {
    let binary = '';
    const chunkSize = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunkSize)
        binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
    return btoa(binary);
}

function decodeThemeImage(data) {
    if (typeof data !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(data))
        throw new Error('В теме повреждены данные изображения.');
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1)
        bytes[index] = binary.charCodeAt(index);
    return bytes;
}

export function getThemeImageByteLength(data) {
    if (typeof data !== 'string') return 0;
    return Math.floor(data.length * 3 / 4) - (data.endsWith('==') ? 2 : data.endsWith('=') ? 1 : 0);
}

export function validateThemeAsset(id, asset) {
    if (!isValidThemeAssetId(id) || !asset || typeof asset !== 'object')
        throw new Error('Некорректный ID или описание изображения.');
    if (!IMAGE_TYPES.has(asset.mime))
        throw new Error('Поддерживаются только PNG, JPEG и WebP.');
    const bytes = decodeThemeImage(asset.data);
    if (!bytes.length || bytes.length > MAX_CHAT_THEME_ASSET_BYTES)
        throw new Error('Размер изображения должен быть не больше 2 МиБ.');
    if (detectThemeImageType(bytes) !== asset.mime)
        throw new Error('Содержимое изображения не совпадает с его форматом.');
    const dimensions = readThemeImageDimensions(bytes, asset.mime);
    if (dimensions.width !== asset.width || dimensions.height !== asset.height)
        throw new Error('Размеры изображения не совпадают с его заголовком.');
    if (!Number.isInteger(dimensions.width) || !Number.isInteger(dimensions.height)
        || dimensions.width < 1 || dimensions.height < 1
        || dimensions.width > 4096 || dimensions.height > 4096
        || dimensions.width * dimensions.height > 16_000_000)
        throw new Error('Размеры изображения должны быть не больше 4096 × 4096 и 16 Мп.');
    return { mime: asset.mime, data: asset.data, width: dimensions.width, height: dimensions.height };
}

export function normalizeChatTheme(theme) {
    if (!theme || typeof theme !== 'object' || theme.version !== CHAT_THEME_VERSION)
        throw new Error('Формат темы чата не поддерживается.');
    if (typeof theme.css !== 'string' || theme.css.length > MAX_CHAT_THEME_CSS_LENGTH)
        throw new Error('CSS темы должен быть текстом не длиннее 100 КиБ.');
    if (!theme.assets || typeof theme.assets !== 'object' || Array.isArray(theme.assets))
        throw new Error('В теме некорректный список изображений.');

    const entries = Object.entries(theme.assets);
    if (entries.length > MAX_CHAT_THEME_ASSETS)
        throw new Error(`В теме может быть не больше ${MAX_CHAT_THEME_ASSETS} изображений.`);
    const assets = {};
    let totalBytes = 0;
    for (const [id, value] of entries) {
        const asset = validateThemeAsset(id, value);
        totalBytes += getThemeImageByteLength(asset.data);
        assets[id] = asset;
    }
    if (totalBytes > MAX_CHAT_THEME_TOTAL_BYTES)
        throw new Error('Общий размер изображений темы не должен превышать 8 МиБ.');
    return { version: CHAT_THEME_VERSION, css: theme.css, assets };
}

function isPrivateIpv4(hostname) {
    const parts = hostname.split('.');
    if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part) || Number(part) > 255))
        return false;
    const [first, second] = parts.map(Number);
    return first === 0 || first === 10 || first === 127
        || (first === 169 && second === 254)
        || (first === 172 && second >= 16 && second <= 31)
        || (first === 192 && second === 168)
        || (first === 100 && second >= 64 && second <= 127)
        || first >= 224;
}

export function normalizeThemeImageUrl(value) {
    let url;
    try {
        url = new URL(String(value || '').trim());
    } catch {
        throw new Error('Введите корректный адрес изображения.');
    }
    if (url.protocol !== 'https:' || url.username || url.password)
        throw new Error('Разрешены только HTTPS-ссылки без логина и пароля.');

    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (!hostname.includes('.') || isPrivateIpv4(hostname)
        || hostname === '::' || hostname === '::1'
        || /^(fc|fd|fe[89ab])/i.test(hostname)
        || /\.(localhost|local|internal|home\.arpa|test|invalid|example)$/.test(hostname))
        throw new Error('Адрес должен вести на общедоступный HTTPS-хост.');

    url.hash = '';
    return url;
}
