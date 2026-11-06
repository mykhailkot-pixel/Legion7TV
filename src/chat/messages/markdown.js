const MARKERS = [
    { token: '***', tag: 'strong', nestedTag: 'em' },
    { token: '**', tag: 'strong' },
    { token: '__', tag: 'u' },
    { token: '~~', tag: 's' },
    { token: '||', tag: 'span', className: 't7-spoiler' },
    { token: '*', tag: 'em' },
    { token: '_', tag: 'em' }
];
const WORD_CHAR_RE = /[\p{L}\p{N}_]/u;
const URL_PREFIX_RE = /(?:\[ref\]\{[^{}\s]+\}|https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/iy;
const MENTION_RE = /(?<![\p{L}\p{N}_])@[a-z0-9_]{1,25}(?![\p{L}\p{N}_])/iy;
const MARKER_SUFFIX_RE = /(?:\*{1,3}|_{1,2}|~{2}|\|{2})+$/;

function isUnderscoreBoundary(text, index, opening) {
    const adjacent = opening ? text[index + 1] : text[index - 1];
    const other = opening ? text[index - 1] : text[index + 1];
    return !!adjacent && !/\s/.test(adjacent) && (!other || !WORD_CHAR_RE.test(other));
}

function markerAt(text, index, opening) {
    return MARKERS.find(({ token }) => {
        if (!text.startsWith(token, index)) return false;
        return token !== '_' || isUnderscoreBoundary(text, index, opening);
    });
}

function createWrapper(marker) {
    const wrapper = document.createElement(marker.tag);
    if (marker.className) {
        wrapper.className = marker.className;
        wrapper.tabIndex = 0;
        wrapper.setAttribute('role', 'button');
        wrapper.setAttribute('aria-label', 'Раскрыть спойлер');
        wrapper.setAttribute('aria-expanded', 'false');
        const toggle = () => {
            if (wrapper.classList.contains('t7-spoiler-revealed')) return;
            wrapper.classList.add('t7-spoiler-revealed');
            wrapper.removeAttribute('role');
            wrapper.removeAttribute('tabindex');
            wrapper.removeAttribute('aria-expanded');
            wrapper.removeAttribute('aria-label');
        };
        wrapper.addEventListener('click', toggle);
        wrapper.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            toggle();
        });
    }
    return wrapper;
}

function parseInline(text, start = 0, closing = null, depth = 0) {
    const fragment = document.createDocumentFragment();
    let offset = start;
    let index = start;
    let changed = false;

    while (index < text.length) {
        URL_PREFIX_RE.lastIndex = index;
        const url = URL_PREFIX_RE.exec(text);
        if (url) {
            const markerSuffix = MARKER_SUFFIX_RE.exec(url[0]);
            index += url[0].length - (markerSuffix ? markerSuffix[0].length : 0);
            continue;
        }

        MENTION_RE.lastIndex = index;
        const mention = MENTION_RE.exec(text);
        if (mention) {
            index += mention[0].length;
            continue;
        }

        if (closing && text.startsWith(closing.token, index)
            && (closing.token !== '_' || isUnderscoreBoundary(text, index, false))) {
            fragment.appendChild(document.createTextNode(text.slice(offset, index)));
            return { fragment, index: index + closing.token.length, closed: true, changed };
        }

        const marker = depth < 32 ? markerAt(text, index, true) : null;
        if (!marker) {
            index++;
            continue;
        }

        const nested = parseInline(text, index + marker.token.length, marker, depth + 1);
        if (nested.closed) {
            fragment.appendChild(document.createTextNode(text.slice(offset, index)));
            const wrapper = createWrapper(marker);
            if (marker.nestedTag) {
                const nestedWrapper = document.createElement(marker.nestedTag);
                nestedWrapper.appendChild(nested.fragment);
                wrapper.appendChild(nestedWrapper);
            } else {
                wrapper.appendChild(nested.fragment);
            }
            fragment.appendChild(wrapper);
            index = nested.index;
            offset = index;
            changed = true;
            continue;
        }

        index += marker.token.length;
    }

    fragment.appendChild(document.createTextNode(text.slice(offset)));
    return { fragment, index, closed: false, changed };
}

export function processMarkdown({ content, kind, source }) {
    if (kind !== 'message') return;
    const parsed = parseInline(source);
    if (parsed.changed) content.replaceChildren(parsed.fragment);
}
