import { SIZES } from '../../core/config.js';
import { S, EM } from '../../core/state.js';
import { has } from '../../core/util.js';
import { setEmoteImage, urlFor } from '../../emotes/emotes.js';
import { getLoadedImgUrl } from '../../emotes/imgcache.js';
import { setEmoteTooltipData } from '../../emotes/tooltip.js';
import { cls, cssVar } from '../../core/ui.js';

const emoteAspectRatios = new Map();
const pendingEmoteImages = new WeakMap();
const imageObservers = new WeakMap();
const imageObserverByTarget = new WeakMap();
const reusableEmoteImages = new Map();
let reusableEmoteImagesTimer = 0;

function reusableImageKey(name, className, url) {
    return `${className}\u0000${name}\u0000${url}`;
}

function takeReusableEmoteImage(rowId, name, className, url) {
    if (!rowId) return null;
    const rowImages = reusableEmoteImages.get(rowId);
    if (!rowImages) return null;
    const key = reusableImageKey(name, className, url);
    const images = rowImages.get(key);
    if (!images || !images.length) return null;
    const image = images.shift();
    if (!images.length) rowImages.delete(key);
    if (!rowImages.size) reusableEmoteImages.delete(rowId);
    return image;
}

export function preserveEmoteImages(root) {
    if (!(root instanceof Element)) return;
    const targets = [];
    if (root.matches('img')) targets.push(root);
    targets.push(...root.querySelectorAll('img'));
    for (const image of targets) {
        const observer = imageObserverByTarget.get(image);
        if (!observer) continue;
        observer.unobserve(image);
        imageObserverByTarget.delete(image);
        pendingEmoteImages.delete(image);
    }

    const rows = [];
    if (root.matches('li[data-mid]')) rows.push(root);
    rows.push(...root.querySelectorAll('li[data-mid]'));

    for (const row of rows) {
        const rowId = row.dataset.mid;
        if (!rowId) continue;
        for (const image of row.querySelectorAll(`img.${cls('e')}, img.${cls('zw')}`)) {
            const url = image.dataset.t7Url;
            if (!S.on || !url || !image.complete || !image.naturalWidth) continue;

            const className = image.classList.contains(cls('zw')) ? 't7-zw' : 't7-e';
            const key = reusableImageKey(image.alt, className, url);
            let rowImages = reusableEmoteImages.get(rowId);
            if (!rowImages) reusableEmoteImages.set(rowId, rowImages = new Map());
            if (!rowImages.has(key)) rowImages.set(key, []);
            rowImages.get(key).push(image);
        }
    }

    if (reusableEmoteImages.size) {
        clearTimeout(reusableEmoteImagesTimer);
        reusableEmoteImagesTimer = setTimeout(clearReusableEmoteImages, 2000);
    }
}

export function clearReusableEmoteImages() {
    clearTimeout(reusableEmoteImagesTimer);
    reusableEmoteImagesTimer = 0;
    reusableEmoteImages.clear();
}

function makeImg(name, em, className, pendingImages, rowId) {
    const img = document.createElement('img');
    img.className = cls(className === 't7-e' ? 'e' : 'zw');
    img.alt = name;
    const resolution = SIZES[S.size].n;
    const url = urlFor(em, resolution);
    const knownRatio = em.r || emoteAspectRatios.get(url);
    const reusableImage = takeReusableEmoteImage(rowId, name, className, url);
    if (reusableImage) {
        if (className === 't7-e') {
            reusableImage.style.setProperty(cssVar('r'), String(Math.max(1, knownRatio || 1)));
            setEmoteTooltipData(reusableImage, name, em);
        }
        return reusableImage;
    }
    if (className === 't7-e') setEmoteTooltipData(img, name, em);
    img.dataset.t7Url = url;
    if (className === 't7-e') img.style.setProperty(cssVar('r'), String(Math.max(1, knownRatio || 1)));
    img.style.visibility = 'hidden';
    img.addEventListener('load', () => {
        if (className === 't7-e' && img.naturalHeight) {
            const ratio = img.naturalWidth / img.naturalHeight;
            emoteAspectRatios.set(url, ratio);
        }
        img.style.visibility = 'visible';
    });
    const cachedSrc = getLoadedImgUrl(url);
    if (cachedSrc) {
        img.src = cachedSrc;
        img.style.visibility = 'visible';
        return img;
    }
    pendingEmoteImages.set(img, { em, resolution, name });
    pendingImages.push(img);
    return img;
}

function loadEmoteImage(img) {
    const pending = pendingEmoteImages.get(img);
    if (!pending) return;
    pendingEmoteImages.delete(img);
    imageObserverByTarget.delete(img);
    setEmoteImage(img, pending.em, pending.resolution, 'lazy', (error) => {
        console.warn('[7TV] картинка не загрузилась', pending.name, error);
    });
}

function observeEmoteImages(images) {
    const groups = new Map();
    for (const image of images) {
        const list = image.closest('.cy-chat-l');
        if (!list || typeof IntersectionObserver !== 'function') {
            loadEmoteImage(image);
            continue;
        }
        if (!groups.has(list)) groups.set(list, []);
        groups.get(list).push(image);
    }

    for (const [list, targets] of groups) {
        let observer = imageObservers.get(list);
        if (!observer) {
            observer = new IntersectionObserver((entries) => {
                for (const entry of entries) {
                    if (!entry.isIntersecting) continue;
                    observer.unobserve(entry.target);
                    loadEmoteImage(entry.target);
                }
            }, { root: list, rootMargin: '300px 0px' });
            imageObservers.set(list, observer);
        }
        for (const target of targets) {
            imageObserverByTarget.set(target, observer);
            observer.observe(target);
        }
    }
}

export function disposePendingEmoteImages(root) {
    preserveEmoteImages(root);
}

export function processEmotes({ content, kind }) {
    if (kind !== 'message' || !S.on) return;

    const rowId = content.closest('li[data-mid]')?.dataset.mid || '';
    const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
    const nodes = [];
    const pendingImages = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    for (const node of nodes) {
        if (node.parentElement && node.parentElement.closest('a')) continue;
        const parts = node.nodeValue.split(/(\s+)/);
        if (!parts.some((part) => has(EM, part))) continue;

        const fragment = document.createDocumentFragment();
        let lastWrap = null;
        for (const part of parts) {
            const emote = has(EM, part) ? EM[part] : null;
            if (emote && emote.zw && lastWrap) {
                lastWrap.appendChild(makeImg(part, emote, 't7-zw', pendingImages, rowId));
                continue;
            }
            if (emote) {
                const wrapper = document.createElement('span');
                wrapper.className = cls('w');
                wrapper.style.setProperty(cssVar('h'), SIZES[S.size].h);
                wrapper.appendChild(makeImg(part, emote, 't7-e', pendingImages, rowId));
                fragment.appendChild(wrapper);
                lastWrap = wrapper;
                continue;
            }
            if (/^\s+$/.test(part)) {
                if (lastWrap) {
                    fragment.appendChild(document.createTextNode(part));
                    continue;
                }
            } else if (part) {
                lastWrap = null;
            }
            if (part) fragment.appendChild(document.createTextNode(part));
        }
        node.replaceWith(fragment);
    }
    observeEmoteImages(pendingImages);
}
