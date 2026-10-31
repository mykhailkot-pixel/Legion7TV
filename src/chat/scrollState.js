import { SEL } from '../core/consts.js';

const scrollStates = new WeakMap();
const scrollListSelector = `${SEL.chatList}, .cy-chat-dmx, .dm-l`;

export function getScrollContainer(element) {
    let fallback = null;
    for (let node = element; node && node.nodeType === 1; node = node.parentElement) {
        if (!node.matches(scrollListSelector)) continue;
        fallback ||= node;
        const overflowY = getComputedStyle(node).overflowY;
        if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') return node;
    }
    return fallback;
}

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
    const list = getScrollContainer(element);
    if (!list) {
        mutate();
        return;
    }

    const wasAtEnd = isAtEnd(list);
    const listRect = list.getBoundingClientRect();
    const rows = list.querySelectorAll('li');
    const candidates = rows.length ? rows : list.children;
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
    getScrollState(list).atEnd = isAtEnd(list);
}
