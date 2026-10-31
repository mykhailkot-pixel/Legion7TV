import { getText } from '../network/net.js';
import { store } from '../core/store.js';
import { STORE } from '../core/consts.js';

const providers = [];
const RESOLVE_CACHE_TTL = 24 * 60 * 60 * 1000;
const MAX_RESOLVED_IMAGES = 500;
const resolvedImages = new Map();
const pendingResolutions = new Map();
let persistentCacheLoaded = false;
let cacheEpoch = 0;

function pruneCache(now = Date.now()) {
    for (const [url, entry] of resolvedImages) {
        if (now - entry.at >= RESOLVE_CACHE_TTL) resolvedImages.delete(url);
    }
    while (resolvedImages.size > MAX_RESOLVED_IMAGES)
        resolvedImages.delete(resolvedImages.keys().next().value);
}

function loadPersistentCache() {
    if (persistentCacheLoaded) return;
    persistentCacheLoaded = true;
    const saved = store.get(STORE.imageResolveCache);
    if (!saved || typeof saved !== 'object') return;
    const now = Date.now();
    for (const [url, entry] of Object.entries(saved)) {
        if (entry && typeof entry.url === 'string' && Number.isFinite(entry.at)
            && now - entry.at < RESOLVE_CACHE_TTL) resolvedImages.set(url, entry);
    }
    pruneCache(now);
}

function savePersistentCache() {
    pruneCache();
    store.set(STORE.imageResolveCache, Object.fromEntries(resolvedImages));
}

function getAttribute(tag, name) {
    const match = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag);
    return match && (match[1] ?? match[2] ?? match[3] ?? '');
}

function decodeHtmlAttribute(value) {
    return value.replace(/&amp;|&#0*38;|&#x0*26;/gi, '&')
        .replace(/&quot;|&#0*34;|&#x0*22;/gi, '"')
        .replace(/&#0*39;|&#x0*27;/gi, "'");
}

function readImageMeta(html) {
    for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
        const tag = match[0];
        const kind = getAttribute(tag, 'property') || getAttribute(tag, 'name');
        if (kind && /^(?:og:image|twitter:image)$/i.test(kind))
            return decodeHtmlAttribute(getAttribute(tag, 'content') || '');
    }
    return '';
}

export function registerImageProvider(provider) {
    if (!provider || typeof provider.id !== 'string' || typeof provider.match !== 'function'
        || typeof provider.resolve !== 'function' || typeof provider.isImageUrl !== 'function')
        throw new TypeError('image provider must define id, match, resolve, and isImageUrl');
    if (providers.some((item) => item.id === provider.id))
        throw new Error('image provider already registered: ' + provider.id);
    providers.push(provider);
}

const imgbb = {
    id: 'imgbb',
    match(url) {
        if (url.hostname === 'i.ibb.co') return /^\/[^/]+\/[^/]+/.test(url.pathname);
        if (url.hostname === 'ibb.co' || url.hostname === 'www.ibb.co')
            return /^\/[a-z0-9]+(?:\/|$)/i.test(url.pathname);
        if (url.hostname === 'imgbb.com' || url.hostname === 'www.imgbb.com')
            return /^\/(?:gallery\/)?[a-z0-9]+(?:\/|$)/i.test(url.pathname);
        return false;
    },
    isImageUrl(url) {
        return /^(?:i\.ibb\.co|[a-z0-9-]+\.imgbb\.com)$/i.test(url.hostname);
    },
    async resolve(url) {
        if (url.hostname === 'i.ibb.co') return url.href;
        const html = await getText(url.href);
        const image = readImageMeta(html);
        const imageUrl = image && new URL(image, url).href;
        if (!imageUrl || !this.isImageUrl(new URL(imageUrl)))
            throw new Error('imgbb page did not contain a supported image URL');
        return imageUrl;
    }
};

registerImageProvider(imgbb);

export function supportsImageUrl(value) {
    let url;
    try { url = new URL(value); }
    catch { return false; }
    return url.protocol === 'https:' && providers.some((provider) => provider.match(url));
}

export async function resolveImageUrl(value) {
    let url;
    try { url = new URL(value); }
    catch { return null; }
    if (url.protocol !== 'https:') return null;
    const provider = providers.find((item) => item.match(url));
    if (!provider) return null;
    const key = url.href;
    loadPersistentCache();
    const cached = resolvedImages.get(key);
    if (cached && Date.now() - cached.at < RESOLVE_CACHE_TTL) return cached.url;
    if (pendingResolutions.has(key)) return pendingResolutions.get(key);

    const epoch = cacheEpoch;
    const pending = (async () => {
        const resolved = await provider.resolve(url);
        const imageUrl = new URL(resolved);
        if (imageUrl.protocol !== 'https:' || !provider.isImageUrl(imageUrl)) return null;
        const entry = { url: imageUrl.href, at: Date.now() };
        if (epoch === cacheEpoch) {
            resolvedImages.set(key, entry);
            savePersistentCache();
        }
        return entry.url;
    })();
    pendingResolutions.set(key, pending);
    try {
        return await pending;
    } finally {
        if (pendingResolutions.get(key) === pending) pendingResolutions.delete(key);
    }
}

export function clearResolvedImageCache() {
    cacheEpoch++;
    resolvedImages.clear();
    pendingResolutions.clear();
    persistentCacheLoaded = true;
    store.set(STORE.imageResolveCache, {});
}
