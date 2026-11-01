import { SEL } from '../core/consts.js';

const scrollListSelector = `${SEL.chatList}, .dm-l`;
const scrollStates = new WeakMap();
const SCROLL_CORRECTION_THRESHOLD = 0.5;
let started = false;

function getContainer(element) {
    return element && element.closest ? element.closest(scrollListSelector) : null;
}

function isAtEnd(list) {
    const maxScroll = list.scrollHeight - list.clientHeight;
    return maxScroll - list.scrollTop <= 1;
}

function scrollToEnd(list) {
    const target = Math.max(0, list.scrollHeight - list.clientHeight);
    if (Math.abs(list.scrollTop - target) > SCROLL_CORRECTION_THRESHOLD) list.scrollTop = target;
}

function getState(list) {
    let state = scrollStates.get(list);
    if (!state) {
        state = { atEnd: isAtEnd(list) };
        scrollStates.set(list, state);
    }
    return state;
}

export const chatScroller = {
    start() {
        if (started) return;
        started = true;
        document.addEventListener('scroll', (event) => {
            const list = event.target;
            if (list && list.matches && list.matches(scrollListSelector)) {
                getState(list).atEnd = isAtEnd(list);
            }
        }, true);
    },

    getContainer,
    isAtEnd,
    scrollToEnd,

    register(list) {
        if (list) getState(list);
    },

    keep(list, mutate) {
        const state = getState(list);
        const atEnd = isAtEnd(list) || state.atEnd;
        let anchor = null;
        if (!atEnd) {
            const listTop = list.getBoundingClientRect().top;
            for (const li of list.children) {
                if (li.tagName !== 'LI') continue;
                const rect = li.getBoundingClientRect();
                if (rect.bottom > listTop + 1) {
                    anchor = { li, offset: rect.top - listTop };
                    break;
                }
            }
        }

        mutate();

        if (!list.isConnected) return;
        if (atEnd) {
            scrollToEnd(list);
        } else if (anchor && anchor.li.isConnected) {
            const delta = anchor.li.getBoundingClientRect().top
                - list.getBoundingClientRect().top - anchor.offset;
            if (Math.abs(delta) > SCROLL_CORRECTION_THRESHOLD) list.scrollTop += delta;
        }
        getState(list).atEnd = isAtEnd(list);
    },

    reinitialize(list, mutate) {
        const scrollTop = list.scrollTop;
        const atEnd = isAtEnd(list);
        const result = mutate();
        if (list.isConnected) list.scrollTop = atEnd ? list.scrollHeight : scrollTop;
        getState(list).atEnd = isAtEnd(list);
        return result;
    },

    stickAtEnd(lists) {
        lists.forEach((list) => {
            if (getState(list).atEnd) scrollToEnd(list);
        });
    },

    preserve(element, mutate) {
        const list = getContainer(element);
        if (!list) {
            mutate();
            return;
        }

        const state = getState(list);
        const wasAtEnd = isAtEnd(list) || state.atEnd;
        const listRect = list.getBoundingClientRect();
        const candidates = [...list.children];
        const anchor = [...candidates].find((child) => {
            const rect = child.getBoundingClientRect();
            return rect.bottom > listRect.top && rect.top < listRect.bottom;
        });
        const anchorTop = anchor && anchor.getBoundingClientRect().top;

        mutate();

        if (wasAtEnd) {
            scrollToEnd(list);
        } else if (anchor && anchor.isConnected) {
            const delta = anchor.getBoundingClientRect().top - anchorTop;
            if (Math.abs(delta) > SCROLL_CORRECTION_THRESHOLD) list.scrollTop += delta;
        }
        getState(list).atEnd = isAtEnd(list);
    }
};
