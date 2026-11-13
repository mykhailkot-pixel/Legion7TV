// Ссылки в чате: отправка через [ref]{...}, разбор на приёме
import { store } from '../../core/store.js';
import { STORE } from '../../core/consts.js';
import { fetchImg } from '../../emotes/imgcache.js';
import { resolveImageUrl, supportsImageUrl } from '../ui/imageProviders.js';
import { rememberSentImages } from '../ui/imagePicker.js';
import { chatScroller } from './scrollState.js';
import { cls } from '../../core/ui.js';

const LINK_ENCODING_KEY = STORE.linkEncoding;
const IMAGE_PREVIEWS_KEY = STORE.imagePreviews;
const previewCache = new Map();
const imagePreviewStates = new WeakMap();
const outgoingBindings = new WeakSet();

export const isLinkEncodingEnabled = () => store.get(LINK_ENCODING_KEY) === true;
export const setLinkEncodingEnabled = (enabled) => store.set(LINK_ENCODING_KEY, !!enabled);
export const areImagePreviewsEnabled = () => store.get(IMAGE_PREVIEWS_KEY) === true;
export const setImagePreviewsEnabled = (enabled) => store.set(IMAGE_PREVIEWS_KEY, !!enabled);

const URL_RE = /\[ref\]\{[^{}\s]+\}|https:\/\/[^\s<>"']+|www\.[^\s<>"']+/giu;
const HOST_OK = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i;
// bare-домены: 2 латинские буквы (ccTLD) или частые общие зоны; так "кто.то" и "main.txt" ссылками не считаются
const TLD = '[a-z]{2}|com|net|org|info|dev|app|xyz|online|site|tech|gov|edu|club|shop|store|blog|cloud|live|link';
const LINK_RE = new RegExp(
    '(?<![\\p{L}\\p{N}_@/.:%-])(?:https?:\\/\\/)?' +
    '(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+(?:' + TLD + ')(?![\\p{L}\\p{N}-])' +
    '(?::\\d{1,5})?(?:[/?#]\\S*)?', 'giu');

export function trimTrailingPunct(raw, options = {}) {
    let end = raw.length;
    while (end > 0) {
        const char = raw[end - 1];
        if (/[.,!?;:]/.test(char) || (options.stripQuotes && (char === '"' || char === "'")) || (options.stripBrackets && char === ']')) {
            end--;
            continue;
        }
        if (char === ')') {
            const text = raw.slice(0, end);
            const unbalanced = (text.match(/\)/g) || []).length > (text.match(/\(/g) || []).length;
            if (options.stripClosingParens || unbalanced) {
                end--;
                continue;
            }
        }
        break;
    }
    return { clean: raw.slice(0, end), tail: raw.slice(end) };
}

export function isSafeHttpsUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && HOST_OK.test(url.hostname);
    } catch {
        return false;
    }
}

function encodeOne(raw) {
    if (/^\[ref\]\{[^{}\s]+\}$/i.test(raw)) return raw;
    let { clean: url, tail } = trimTrailingPunct(raw, {
        stripQuotes: true,
        stripBrackets: true
    });
    url = url.replace(/^https?:\/\//i, '');
    const i = url.search(/[/?#]/);
    const host = (i < 0 ? url : url.slice(0, i)).toLowerCase().replace(/\./g, '_');
    const rest = i < 0 ? '' : url.slice(i).replace(/\./g, '%2E').replace(/\{/g, '%7B').replace(/\}/g, '%7D');
    return '[ref]{' + host + rest + '}' + tail;
}
export const encodeLinks = (text) => text.replace(LINK_RE, encodeOne);

// [ref]{www_bergfex_at/w/geierhaupt} -> https://www.bergfex.at/w/geierhaupt
export function refToUrl(body) {
    const i = body.search(/[/?#]/);
    const host = (i < 0 ? body : body.slice(0, i)).replace(/_/g, '.');
    const rest = i < 0 ? '' : body.slice(i).replace(/%2E/gi, '.');
    return 'https://' + host + rest;
}

function linkifyText(root, showImages) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    for (const node of nodes) {
        if (node.parentElement && node.parentElement.closest('a')) continue;
        const text = node.nodeValue;
        const matches = [...text.matchAll(URL_RE)];
        if (!matches.length) continue;

        const fragment = document.createDocumentFragment();
        let offset = 0;
        for (const match of matches) {
            const start = match.index;
            if (start < offset) continue;
            const { clean: url } = trimTrailingPunct(match[0]);
            let href, label;
            if (/^\[ref\]/i.test(url)) {
                href = refToUrl(url.slice(6, -1));
                label = href.slice(8);
            } else {
                href = url.startsWith('www.') ? 'https://' + url : url;
                label = url;
            }

            fragment.appendChild(document.createTextNode(text.slice(offset, start)));
            if (isSafeHttpsUrl(href)) {
                const anchor = document.createElement('a');
                anchor.className = cls('link');
                anchor.href = href;
                anchor.title = href;
                anchor.target = '_blank';
                anchor.rel = 'noopener noreferrer';
                anchor.textContent = label;
                if (showImages && supportsImageUrl(href)) {
                    anchor.classList.add(cls('image-pending'));
                    imagePreviewStates.set(anchor, 'queued');
                }
                fragment.appendChild(anchor);
                offset = start + url.length;
            } else {
                fragment.appendChild(document.createTextNode(match[0]));
                offset = start + match[0].length;
            }
        }
        fragment.appendChild(document.createTextNode(text.slice(offset)));
        node.replaceWith(fragment);
    }
}

function buildPreview(anchor, src, w, h) {
    const image = document.createElement('img');
    image.className = cls('image-preview');
    image.alt = 'Изображение по ссылке';
    image.decoding = 'sync';
    image.width = w;
    image.height = h;
    image.src = src;
    anchor.replaceChildren(image);
    anchor.classList.remove(cls('image-pending'));
    anchor.classList.add(cls('image-link'));
    imagePreviewStates.set(anchor, 'done');
}

async function toDataUrl(objectUrl) {
    const response = await fetch(objectUrl);
    if (!response.ok) throw new Error('image preview data could not be read');
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error || new Error('image preview could not be encoded'));
        reader.readAsDataURL(blob);
    });
}

async function addImagePreview(anchor) {
    const state = imagePreviewStates.get(anchor);
    if (state === 'done' || state === 'loading') return;
    if (!supportsImageUrl(anchor.href)) return;
    try {
        imagePreviewStates.set(anchor, 'loading');
        const cached = previewCache.get(anchor.href);
        if (cached) {
            if (anchor.isConnected) {
                chatScroller.preserve(anchor, () => buildPreview(anchor, cached.src, cached.w, cached.h));
            }
            return;
        }
        const imageUrl = await resolveImageUrl(anchor.href);
        if (!imageUrl || !anchor.isConnected) {
            anchor.classList.remove(cls('image-pending'));
            imagePreviewStates.delete(anchor);
            return;
        }
        const objectUrl = await fetchImg(imageUrl, true);
        if (!anchor.isConnected) return;
        const image = document.createElement('img');
        let imageSrc;
        try {
            imageSrc = await toDataUrl(objectUrl);
            image.src = imageSrc;
            await image.decode();
        } catch {
            // Data URLs preserve animation and avoid exposing blob URLs, but strict page CSP may block them.
            imageSrc = objectUrl;
            image.src = objectUrl;
            await image.decode();
        }
        if (!anchor.isConnected) return;
        const preview = { src: imageSrc, w: image.naturalWidth, h: image.naturalHeight };
        previewCache.set(anchor.href, preview);
        chatScroller.preserve(anchor, () => buildPreview(anchor, preview.src, preview.w, preview.h));
    } catch (error) {
        if (anchor.isConnected) {
            anchor.classList.remove(cls('image-pending'));
            imagePreviewStates.delete(anchor);
        }
        console.warn('[Images] не удалось обработать ссылку', anchor.href, error);
    }
}

export function processLinks({ content, room }) {
    const parseLinks = isLinkEncodingEnabled();
    const previewsEnabled = areImagePreviewsEnabled();
    const showImages = previewsEnabled && room !== 'dm';
    if (!parseLinks && !previewsEnabled) return;
    linkifyText(content, showImages);
    if (showImages) content.querySelectorAll(`a.${cls('link')}`).forEach((anchor) => { addImagePreview(anchor); });
}

function isExcludedChatSend(form, input) {
    const activeTab = form.closest('.cy-chat')?.querySelector('[data-tab][aria-selected="true"]');
    const tab = activeTab?.dataset.tab;
    return tab === 'gl' || tab === 'lg' || (tab === 'g' && input.value.trim().startsWith('/'));
}

function prepareOutgoingMessage(form, input) {
    if (isExcludedChatSend(form, input)) return;
    if (!isLinkEncodingEnabled()) {
        rememberSentImages(input.value);
        return;
    }

    const text = input.value;
    rememberSentImages(text);
    const encoded = encodeLinks(text);
    if (encoded === text) return;

    input.value = encoded;
    setTimeout(() => {
        if (input.isConnected && input.value === encoded) input.value = text;
    });
}

function onFormKeyDown(form, input, event) {
    if (event.key !== 'Enter' || event.shiftKey || event.altKey || event.ctrlKey
        || event.metaKey || event.isComposing || event.keyCode === 229) return;
    if (event.target !== input) return;
    prepareOutgoingMessage(form, input);
}

export function bindOutgoingLinkEncoding(form, input) {
    if (outgoingBindings.has(form)) return () => {};
    outgoingBindings.add(form);
    const onKeyDown = (event) => onFormKeyDown(form, input, event);
    const onSubmit = () => prepareOutgoingMessage(form, input);
    form.addEventListener('keydown', onKeyDown, true);
    form.addEventListener('submit', onSubmit, true);

    const dispose = () => {
        if (!outgoingBindings.has(form)) return;
        outgoingBindings.delete(form);
        form.removeEventListener('keydown', onKeyDown, true);
        form.removeEventListener('submit', onSubmit, true);
    };
    return dispose;
}