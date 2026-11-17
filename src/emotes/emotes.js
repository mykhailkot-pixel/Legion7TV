import { EM, st } from '../core/state.js';
import { STORE } from '../core/consts.js';
import { store } from '../core/store.js';
import { fetchImg, getLoadedImgUrl } from './imgcache.js';

const EMOTE_ID = /^[0-9A-Za-z]{20,32}$/;
let catalogChannel = location.pathname;

function imageBaseFor(value) {
    if (typeof value !== 'string' || !value) return location.origin;
    try {
        const url = new URL(value, location.origin);
        const host = url.hostname.toLowerCase();
        const siteHost = host === location.hostname
            || host === 'multidonate.ru' || host.endsWith('.multidonate.ru')
            || host === 'legiongame.gg' || host.endsWith('.legiongame.gg');
        if (siteHost && url.protocol === 'https:' && !url.username && !url.password)
            return url.href.replace(/\/+$/, '');
    } catch {}
    return location.origin;
}

function catalogKey(channel) {
    return STORE.siteEmoteCatalogPrefix + encodeURIComponent(channel);
}

function replaceCatalog(channel, entries, base, persist = true) {
    if (channel !== location.pathname) return;
    const map = Object.create(null);
    const imageBase = imageBaseFor(base);
    const savedEntries = [];
    for (const entry of entries) {
        if (!Array.isArray(entry) || typeof entry[0] !== 'string'
            || !entry[0] || entry[0].length > 64 || /\s/.test(entry[0])
            || entry[0] === '__proto__' || entry[0] === 'constructor'
            || typeof entry[1] !== 'string' || !EMOTE_ID.test(entry[1])) continue;
        const [name, id] = entry;
        savedEntries.push([name, id]);
        map[name] = {
            base: `https://cdn.7tv.app/emote/${encodeURIComponent(id)}`,
            siteBase: imageBase,
            f: ['1x.webp', '2x.webp', '4x.webp'],
            staticF: ['1x_static.webp', '2x_static.webp', '4x_static.webp'],
            id,
            native: true,
            g: false
        };
    }

    catalogChannel = channel;
    if (persist) store.set(catalogKey(channel), { base: imageBase, entries: savedEntries });
    const currentNames = Object.keys(EM);
    const nextNames = Object.keys(map);
    if (currentNames.length === nextNames.length
        && nextNames.every((name) => EM[name]
            && EM[name].id === map[name].id
            && EM[name].siteBase === map[name].siteBase)) return;
    for (const name of Object.keys(EM)) delete EM[name];
    Object.assign(EM, map);
    setStatus(Object.keys(map).length
        ? `Смайлы канала: ${Object.keys(map).length}`
        : 'На этом канале нет смайлов сайта');
    st.hooks.emotes();
}

window.addEventListener('message', (event) => {
    const data = event.data;
    if (event.source !== window || event.origin !== location.origin
        || !data || data.source !== 't7-site-emotes'
        || typeof data.channel !== 'string' || !Array.isArray(data.entries)) return;
    replaceCatalog(data.channel, data.entries.slice(0, 5000), data.base);
});

export function urlFor(emote, resolution, staticOnly = false) {
    const files = staticOnly ? emote.staticF || emote.f : emote.f;
    let best = null;
    for (const file of files || []) {
        const size = parseInt(file, 10);
        if (size <= resolution && (best === null || size > parseInt(best, 10))) best = file;
    }
    return `${emote.base}/${best || (files && files[0]) || '1x.webp'}`;
}

function siteUrlFor(emote, resolution, staticOnly) {
    const files = staticOnly ? emote.staticF || emote.f : emote.f;
    const file = (files || []).reduce((best, candidate) => {
        const size = parseInt(candidate, 10);
        return size <= resolution && (!best || size > parseInt(best, 10)) ? candidate : best;
    }, null) || (files && files[0]) || '1x.webp';
    return `${emote.siteBase}/api/emote/7tv/${encodeURIComponent(emote.id)}/${file}`;
}

export function setEmoteImage(image, emote, resolution, loading = 'lazy', onError, options = {}) {
    const isCurrent = typeof options.isCurrent === 'function' ? options.isCurrent : () => true;
    const staticOnly = options.staticOnly === true;
    const src = urlFor(emote, resolution, staticOnly);
    image.loading = loading;
    image.decoding = 'async';
    image.removeAttribute('srcset');
    const cachedSrc = getLoadedImgUrl(src);
    if (cachedSrc) {
        if (isCurrent()) image.src = cachedSrc;
        return Promise.resolve(cachedSrc);
    }

    return fetchImg(src, false).then((cachedUrl) => {
        if (isCurrent()) image.src = cachedUrl;
        return cachedUrl;
    }, (error) => {
        const fallbackSrc = staticOnly ? urlFor(emote, resolution) : '';
        if (fallbackSrc && fallbackSrc !== src) {
            return fetchImg(fallbackSrc, false).then((cachedUrl) => {
                if (isCurrent()) image.src = cachedUrl;
                return cachedUrl;
            }, (fallbackError) => {
                if (!isCurrent()) return '';
                image.onerror = () => {
                    if (isCurrent() && onError) onError(fallbackError);
                };
                image.src = siteUrlFor(emote, resolution, false);
                return '';
            });
        }
        if (!isCurrent()) return '';
        image.onerror = () => {
            if (isCurrent() && onError) onError(error);
        };
        image.src = siteUrlFor(emote, resolution, false);
        return '';
    });
}

export function setStatus(text) {
    st.status = text;
    st.hooks.status(text);
}

export async function reload() {
    if (catalogChannel !== location.pathname) {
        catalogChannel = location.pathname;
        for (const name of Object.keys(EM)) delete EM[name];
        st.hooks.emotes();
    }
    const cached = store.get(catalogKey(catalogChannel));
    if (cached && Array.isArray(cached.entries)) {
        replaceCatalog(catalogChannel, cached.entries, cached.base, false);
        return;
    }
    setStatus(Object.keys(EM).length
        ? `Смайлы канала: ${Object.keys(EM).length}`
        : 'Ожидание каталога смайлов сайта…');
}
