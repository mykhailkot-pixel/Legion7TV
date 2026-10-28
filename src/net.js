// Сеть через GM_xmlhttpRequest: он не подчиняется CSP сайта.
const ALLOWED = ['7tv.io', 'cdn.7tv.app', 'api.ivr.fi'];

// Прокси (необязательно). '' = ходить напрямую.
// Если включаешь: добавь домен прокси в @connect в header.txt.
const PROXY = '';
const ROUTES = { '7tv.io': 'api', 'cdn.7tv.app': 'cdn', 'api.ivr.fi': 'ivr' };

const urlOk = (url) => {
    try { const u = new URL(url); return u.protocol === 'https:' && ALLOWED.includes(u.hostname); }
    catch { return false; }
};

function viaProxy(url) {
    const u = new URL(url);
    const k = ROUTES[u.hostname];
    return PROXY && k ? `${PROXY}/${k}${u.pathname}${u.search}` : url;
}

const gmOnce = (url, responseType) => new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
        method: 'GET', url, responseType, timeout: 15000,
        onload: (r) => (r.status >= 200 && r.status < 300) ? resolve(r) : reject(new Error(url + ' -> ' + r.status)),
        onerror: reject, ontimeout: reject
    });
});

const gm = async (url, responseType) => {
    if (!urlOk(url)) throw new Error('url not allowed');
    const tries = PROXY ? [viaProxy(url), url] : [url];   // сначала прокси, потом напрямую
    let last;
    for (const t of tries) {
        try { return await gmOnce(t, responseType); } catch (e) { last = e; }
    }
    throw last;
};

export const getJson = async (url) => JSON.parse((await gm(url)).responseText);

export const getBuf = async (url) => {
    const r = await gm(url, 'blob');
    const type = (r.response && r.response.type) || 'image/webp';
    const buf = await new Promise((res, rej) => {
        const fr = new FileReader();
        fr.onload = () => res(fr.result);
        fr.onerror = rej;
        fr.readAsArrayBuffer(r.response);
    });
    return new Blob([buf], { type });
};