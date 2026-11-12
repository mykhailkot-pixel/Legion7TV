import { store } from '../core/store.js';
import { STORE } from '../core/consts.js';

const ALLOWED = ['7tv.io', 'cdn.7tv.app', 'api.ivr.fi', 'ibb.co', 'www.ibb.co', 'imgbb.com', 'www.imgbb.com', 'i.ibb.co'];
const ROUTES = { '7tv.io': 'api', 'cdn.7tv.app': 'cdn', 'api.ivr.fi': 'ivr' };

// Прокси по умолчанию для всех, кто не настроил свой. '' = напрямую.
const DEFAULT_PROXY = '';

export const normProxy = (v) => {
    v = String(v || '').trim().replace(/\/+$/, '');
    try { const u = new URL(v); return u.protocol === 'https:' ? u.origin : ''; } catch { return ''; }
};

let proxy = (() => {
    const v = store.get(STORE.networkProxy);
    return normProxy(typeof v === 'string' ? v : DEFAULT_PROXY);
})();
let proxyDownUntil = 0;

export const getProxy = () => proxy;
export function setProxy(v) {
    proxy = normProxy(v);
    proxyDownUntil = 0;
    store.set(STORE.networkProxy, proxy);   // пустая строка = осознанно «без прокси»
}

const urlOk = (url) => {
    try { const u = new URL(url); return u.protocol === 'https:' && ALLOWED.includes(u.hostname); }
    catch { return false; }
};

function viaProxy(url) {
    const u = new URL(url);
    return `${proxy}/${ROUTES[u.hostname]}${u.pathname}${u.search}`;
}

const extensionRequest = (url, responseType, timeout) => new Promise((resolve, reject) => {
    const api = globalThis.browser || globalThis.chrome;
    if (!api || !api.runtime || typeof api.runtime.sendMessage !== 'function') {
        reject(new Error('no supported extension request API is available'));
        return;
    }
    const request = api.runtime.sendMessage({ type: 'LEGION7TV_FETCH', url, responseType, timeout });
    Promise.resolve(request).then((result) => {
        if (!result || !result.ok) {
            reject(new Error(result && result.error || 'extension request failed'));
            return;
        }
        if (responseType === 'blob') {
            const binary = atob(result.body);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            resolve({ status: result.status, response: new Blob([bytes], { type: result.contentType }) });
        } else {
            resolve({ status: result.status, responseText: result.body });
        }
    }, reject);
});

const requestAllowed = async (url, responseType) => {
    if (!urlOk(url)) throw new Error('url not allowed');
    const route = ROUTES[new URL(url).hostname];
    if (proxy && route && Date.now() > proxyDownUntil) {
        try { return await extensionRequest(viaProxy(url), responseType, 6000); }
        catch { proxyDownUntil = Date.now() + 120000; }   // 2 минуты идём напрямую
    }
    return extensionRequest(url, responseType, 15000);
};

// проверка прокси из настроек
export async function testProxy(v) {
    const p = normProxy(v);
    if (!p) throw new Error('нужен адрес вида https://имя.workers.dev');
    const r = await extensionRequest(p + '/api/v3/emote-sets/global', undefined, 8000);
    const j = JSON.parse(r.responseText);
    if (!j || !Array.isArray(j.emotes)) throw new Error('ответ не похож на 7TV');
    return j.emotes.length;
}

export const getJson = async (url) => JSON.parse((await requestAllowed(url)).responseText);
export const getText = async (url) => (await requestAllowed(url)).responseText;

export const getBuf = async (url) => {
    const r = await requestAllowed(url, 'blob');
    const type = (r.response && r.response.type) || 'image/webp';
    const buf = await new Promise((res, rej) => {
        const fr = new FileReader();
        fr.onload = () => res(fr.result);
        fr.onerror = rej;
        fr.readAsArrayBuffer(r.response);
    });
    return new Blob([buf], { type });
};