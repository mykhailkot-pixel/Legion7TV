import { SEL } from '../core/consts.js';

const scrollListSelector = `${SEL.chatList}, .dm-l`;
const scrollStates = new WeakMap();
let started = false;

function getContainer(element) {
    return element && element.closest ? element.closest(scrollListSelector) : null;
}

function isAtEnd(list) {
    return list.scrollHeight - list.scrollTop - list.clientHeight < 40;
}

function scrollToEnd(list) {
    list.scrollTo({ top: list.scrollHeight, behavior: 'instant' });
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

        const wasAtEnd = isAtEnd(list);
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
            list.scrollTop += anchor.getBoundingClientRect().top - anchorTop;
        }
        getState(list).atEnd = isAtEnd(list);
    }
};
