import { SEL } from '../core/consts.js';

const scrollStates = new WeakMap();
const scrollListSelector = `${SEL.chatList}, .dm-l`;

export function isAtEnd(list) {
    return list.scrollHeight - list.scrollTop - list.clientHeight < 40;
}

export function scrollToEnd(list) {
    list.scrollTo({ top: list.scrollHeight, behavior: 'instant' });
}

export function getScrollState(list) {
    let state = scrollStates.get(list);
    if (!state) {
        state = { atEnd: isAtEnd(list) };
        scrollStates.set(list, state);
    }
    return state;
}

export function mutatePreservingScroll(element, mutate) {
    const list = element.closest && element.closest(scrollListSelector);
    if (!list) {
        mutate();
        return;
    }

    const wasAtEnd = isAtEnd(list);
    const listRect = list.getBoundingClientRect();
    const anchor = [...list.children].find((child) => {
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
    getScrollState(list).atEnd = isAtEnd(list);
}
