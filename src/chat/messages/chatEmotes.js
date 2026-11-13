import { SIZES } from '../../core/config.js';
import { S, EM } from '../../core/state.js';
import { has } from '../../core/util.js';
import { setEmoteImage, urlFor } from '../../emotes/emotes.js';
import { setEmoteTooltipData } from '../../emotes/tooltip.js';
import { cls, cssVar } from '../../core/ui.js';

const emoteAspectRatios = new Map();
const loadedEmoteImages = new Set();

function makeImg(name, em, className) {
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
    setEmoteImage(img, em, resolution, 'lazy', (error) => {
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
                wrapper.className = cls('w');
                wrapper.style.setProperty(cssVar('h'), SIZES[S.size].h);
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
