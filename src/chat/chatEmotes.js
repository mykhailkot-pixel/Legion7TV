import { SIZES } from '../core/config.js';
import { S, EM } from '../core/state.js';
import { has } from '../core/util.js';
import { fetchImg } from '../emotes/imgcache.js';
import { reusableUrlsFor, urlFor } from '../emotes/emotes.js';
import { setEmoteTooltipData } from '../emotes/tooltip.js';

const emoteAspectRatios = new Map();
const emoteAspectRatioLoads = new Map();

function loadAspectRatio(url, data) {
    if (emoteAspectRatios.has(url)) return Promise.resolve(emoteAspectRatios.get(url));
    if (emoteAspectRatioLoads.has(url)) return emoteAspectRatioLoads.get(url);

    const image = new Image();
    image.src = data;
    const load = image.decode().then(() => {
        const ratio = image.naturalWidth / image.naturalHeight;
        emoteAspectRatios.set(url, ratio);
        emoteAspectRatioLoads.delete(url);
        return ratio;
    }, (error) => {
        emoteAspectRatioLoads.delete(url);
        throw error;
    });
    emoteAspectRatioLoads.set(url, load);
    return load;
}

function makeImg(name, em, cls) {
    const img = document.createElement('img');
    img.className = cls;
    img.alt = name;
    if (cls === 't7-e') setEmoteTooltipData(img, name, em);
    const resolution = SIZES[S.size].n;
    const url = urlFor(em, resolution);
    if (cls === 't7-e' && emoteAspectRatios.has(url)) {
        img.style.aspectRatio = String(emoteAspectRatios.get(url));
    }
    fetchImg(url, true, reusableUrlsFor(em, resolution)).then(async (data) => {
        if (cls === 't7-e') img.style.aspectRatio = String(await loadAspectRatio(url, data));
        img.src = data;
    }).catch((error) => {
        console.warn('[7TV] картинка не загрузилась', name, error);
    });
    return img;
}

export function processEmotes({ content, kind }) {
    if (kind !== 'message' || !S.on) return;

    const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
    const nodes = [];
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
                lastWrap.appendChild(makeImg(part, emote, 't7-zw'));
                continue;
            }
            if (emote) {
                const wrapper = document.createElement('span');
                wrapper.className = 't7-w';
                wrapper.appendChild(makeImg(part, emote, 't7-e'));
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
}
