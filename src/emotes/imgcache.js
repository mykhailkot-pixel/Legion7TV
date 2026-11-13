import { getBuf } from '../network/net.js';

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_BASE64_LENGTH = Math.ceil(MAX_IMAGE_BYTES / 3) * 4;

// очередь: 8 запросов параллельно, эмоуты из чата (hi) обгоняют картинки окошка (lo)
const Q = { hi: [], lo: [], run: 0, max: 8 };
function pump() {
    while (Q.run < Q.max) {
        const j = Q.hi.shift() || Q.lo.shift();
        if (!j) return;
        Q.run++;
        j.fn().then(j.res, j.rej).finally(() => { Q.run--; pump(); });
    }
}
const enqueue = (fn, hi) => new Promise((res, rej) => { (hi ? Q.hi : Q.lo).push({ fn, res, rej }); pump(); });

const imgCache = new Map();   // url -> Promise<blob: URL>

function extensionRuntime() {
    const api = globalThis.browser || globalThis.chrome;
    return api && api.runtime && typeof api.runtime.sendMessage === 'function'
        ? api.runtime
        : null;
}

async function sendImageCacheMessage(message) {
    const runtime = extensionRuntime();
    return runtime ? runtime.sendMessage(message) : null;
}

function decodeBase64(value, contentType) {
    if (typeof value !== 'string' || value.length > MAX_BASE64_LENGTH)
        throw new Error('cached image exceeds the 12 MiB limit');
    const binary = atob(value);
    if (binary.length > MAX_IMAGE_BYTES)
        throw new Error('cached image exceeds the 12 MiB limit');
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: contentType || 'application/octet-stream' });
}

async function encodeBase64(blob) {
    if (!(blob instanceof Blob) || blob.size > MAX_IMAGE_BYTES)
        throw new Error('image exceeds the 12 MiB cache limit');
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    const chunkSize = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunkSize)
        binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
    return btoa(binary);
}

async function getCachedImage(url) {
    const result = await sendImageCacheMessage({ type: 'IMG_GET', url });
    if (!result) return null;
    if (!result.ok) throw new Error(result.error || 'image cache read failed');
    return result.found ? decodeBase64(result.body, result.contentType) : null;
}

async function putCachedImage(url, blob) {
    const runtime = extensionRuntime();
    if (!runtime || blob.size > MAX_IMAGE_BYTES) return;
    const body = await encodeBase64(blob);
    const result = await runtime.sendMessage({
        type: 'IMG_PUT',
        url,
        contentType: blob.type || 'application/octet-stream',
        body
    });
    if (!result || !result.ok) throw new Error(result && result.error || 'image cache write failed');
}

export function fetchImg(url, hi, reusableUrls = []) {
    if (imgCache.has(url)) return imgCache.get(url);
    const p = (async () => {
        let blob;
        try {
            blob = await getCachedImage(url);
            for (const candidate of reusableUrls) {
                if (blob) break;
                if (candidate !== url) blob = await getCachedImage(candidate);
            }
        } catch (error) {
            console.warn('[Images] image cache read failed', error);
        }
        if (!blob) {
            blob = await enqueue(() => getBuf(url), hi);
            try {
                await putCachedImage(url, blob);
            } catch (error) {
                console.warn('[Images] image cache write failed', error);
            }
        }
        return URL.createObjectURL(blob);
    })();
    p.catch(() => imgCache.delete(url));
    imgCache.set(url, p);
    return p;
}

export async function clearImgs() {
    imgCache.clear();
    const result = await sendImageCacheMessage({ type: 'IMG_CLEAR' });
    if (result && !result.ok) throw new Error(result.error || 'image cache clear failed');
}
