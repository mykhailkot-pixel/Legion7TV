import { SIZES } from '../core/config.js';
import { S, EM } from '../core/state.js';
import { has } from '../core/util.js';
import { fetchImg } from '../emotes/imgcache.js';
import { reusableUrlsFor, urlFor } from '../emotes/emotes.js';
import { setEmoteTooltipData } from '../emotes/tooltip.js';
import { chatScroller } from './scrollState.js';

function makeImg(name, em, cls) {
    const img = document.createElement('img');
    img.className = cls;
    img.alt = name;
    if (cls === 't7-e') setEmoteTooltipData(img, name, em);
    const resolution = SIZES[S.size].n;
    fetchImg(urlFor(em, resolution), true, reusableUrlsFor(em, resolution)).then(async (data) => {
        if (cls !== 't7-e') {
            img.src = data;
            return;
        }
        const decoded = new Image();
        decoded.src = data;
        await decoded.decode();
        if (!img.isConnected) return;
        chatScroller.preserve(img, () => {
            img.style.aspectRatio = `${decoded.naturalWidth} / ${decoded.naturalHeight}`;
            img.src = data;
        });
    }).catch((error) => {
        console.warn('[7TV] картинка не загрузилась', name, error);
        if (img.isConnected) {
            chatScroller.preserve(img, () => img.replaceWith(document.createTextNode(name)));
        }
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
