import { SIZES } from '../../core/config.js';
import { S, EM } from '../../core/state.js';
import { has } from '../../core/util.js';
import { setEmoteImage, urlFor } from '../../emotes/emotes.js';
import { setEmoteTooltipData } from '../../emotes/tooltip.js';
import { cls, cssVar } from '../../core/ui.js';

const emoteAspectRatios = new Map();
const loadedEmoteImages = new Set();
const pendingEmoteImages = new WeakMap();
const imageObservers = new WeakMap();
const imageObserverByTarget = new WeakMap();

function makeImg(name, em, className, pendingImages) {
    const img = document.createElement('img');
    img.className = cls(className === 't7-e' ? 'e' : 'zw');
    img.alt = name;
    if (className === 't7-e') setEmoteTooltipData(img, name, em);
    const resolution = SIZES[S.size].n;
    const url = urlFor(em, resolution);
    const knownRatio = em.r || emoteAspectRatios.get(url);
    if (className === 't7-e') img.style.setProperty(cssVar('r'), String(Math.max(1, knownRatio || 1)));
    img.style.visibility = loadedEmoteImages.has(url) ? 'visible' : 'hidden';
    img.addEventListener('load', () => {
        loadedEmoteImages.add(url);
        if (className === 't7-e' && img.naturalHeight) {
            const ratio = img.naturalWidth / img.naturalHeight;
            emoteAspectRatios.set(url, ratio);
        }
        img.style.visibility = 'visible';
    });
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
    if (!(root instanceof Element)) return;
    const targets = [];
    if (root.matches('img')) targets.push(root);
    targets.push(...root.querySelectorAll('img'));
    for (const target of targets) {
        const observer = imageObserverByTarget.get(target);
        if (!observer) continue;
        observer.unobserve(target);
        imageObserverByTarget.delete(target);
        pendingEmoteImages.delete(target);
    }
}

export function processEmotes({ content, kind }) {
    if (kind !== 'message' || !S.on) return;

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
                lastWrap.appendChild(makeImg(part, emote, 't7-zw', pendingImages));
                continue;
            }
            if (emote) {
                const wrapper = document.createElement('span');
                wrapper.className = cls('w');
                wrapper.style.setProperty(cssVar('h'), SIZES[S.size].h);
                wrapper.appendChild(makeImg(part, emote, 't7-e', pendingImages));
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
