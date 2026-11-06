import { SEL } from '../core/consts.js';

const scrollListSelector = `${SEL.chatList}, .dm-l`;
const scrollStates = new WeakMap();
const keyedScrollStates = new Map();
const SCROLL_CORRECTION_THRESHOLD = 0.5;
let started = false;

function getContainer(element) {
    return element && element.closest ? element.closest(scrollListSelector) : null;
}

function isAtEnd(list) {
    const maxScroll = list.scrollHeight - list.clientHeight;
    return maxScroll - list.scrollTop <= SCROLL_CORRECTION_THRESHOLD;
}

function updateAtEnd(list, state) {
    if (list.scrollHeight > list.clientHeight) state.atEnd = isAtEnd(list);
}

function savePosition(list, state) {
    if (state.key && list.clientHeight) {
        keyedScrollStates.set(state.key, {
            list,
            top: list.scrollTop,
            atEnd: state.atEnd
        });
    }
}

function restorePosition(list, state) {
    const saved = state.key && keyedScrollStates.get(state.key);
    if (!saved || !list.clientHeight) return;
    const maxScroll = Math.max(0, list.scrollHeight - list.clientHeight);
    list.scrollTop = saved.atEnd ? maxScroll : Math.min(saved.top, maxScroll);
    state.atEnd = saved.atEnd && maxScroll - list.scrollTop <= SCROLL_CORRECTION_THRESHOLD;
    state.lastScrollTop = list.scrollTop;
}

function scrollToEnd(list) {
    const target = Math.max(0, list.scrollHeight - list.clientHeight);
    if (Math.abs(list.scrollTop - target) > SCROLL_CORRECTION_THRESHOLD) list.scrollTop = target;
}

function getState(list) {
    let state = scrollStates.get(list);
    if (!state) {
        state = {
            atEnd: isAtEnd(list),
            rows: new Map(),
            resizeObserver: null,
            mutationObserver: null,
            lastScrollTop: list.scrollTop,
            userScrollVersion: 0,
            userScrollUntil: 0
        };
        scrollStates.set(list, state);
    }
    return state;
}

function markUserScroll(event) {
    const list = getContainer(event.target);
    if (list) {
        const state = getState(list);
        const version = ++state.userScrollVersion;
        state.userScrollUntil = performance.now() + 250;
        requestAnimationFrame(() => {
            if (!list.isConnected || state.userScrollVersion !== version) return;
            updateAtEnd(list, state);
            savePosition(list, state);
        });
    }
}

function refreshRows(list, state) {
    observeSizeChanges(list, state);
    const listRect = list.getBoundingClientRect();
    const rows = new Set([...list.children].filter((child) => child.tagName === 'LI'));
    for (const row of state.rows.keys()) {
        if (!rows.has(row)) {
            if (state.resizeObserver) state.resizeObserver.unobserve(row);
            state.rows.delete(row);
        }
    }
    for (const row of rows) {
        if (!state.rows.has(row) && state.resizeObserver) state.resizeObserver.observe(row);
        const rect = row.getBoundingClientRect();
        state.rows.set(row, { top: rect.top - listRect.top, height: rect.height });
    }
    state.lastScrollTop = list.scrollTop;
}

function visibleAnchor(list, state) {
    let index = 0;
    for (const [row, geometry] of state.rows) {
        if (geometry.top + geometry.height > 0 && geometry.top < list.clientHeight) {
            return { row, id: row.dataset.mid || '', top: geometry.top, index };
        }
        index++;
    }
    return null;
}

function findAnchorRow(list, state, anchor) {
    if (anchor.row.isConnected && list.contains(anchor.row)) return anchor.row;
    const rows = [...list.children].filter((child) => child.tagName === 'LI');
    if (anchor.id) {
        const match = rows.find((row) => row.dataset.mid === anchor.id);
        if (match) return match;
    }

    const previousRows = [...state.rows.keys()];
    for (let i = anchor.index + 1; i < previousRows.length; i++) {
        if (previousRows[i].isConnected && list.contains(previousRows[i])) return previousRows[i];
    }
    for (let i = anchor.index - 1; i >= 0; i--) {
        if (previousRows[i].isConnected && list.contains(previousRows[i])) return previousRows[i];
    }
    return rows[Math.min(anchor.index, rows.length - 1)] || null;
}

function restoreAnchor(list, state, anchor) {
    if (!anchor) return;
    const row = findAnchorRow(list, state, anchor);
    if (!row) return;
    const delta = row.getBoundingClientRect().top
        - list.getBoundingClientRect().top - anchor.top;
    if (Math.abs(delta) > SCROLL_CORRECTION_THRESHOLD) list.scrollTop += delta;
}

function observeSizeChanges(list, state) {
    if (state.resizeObserver) return;
    state.resizeObserver = new ResizeObserver(() => {
        if (!list.isConnected) return;
        const anchor = visibleAnchor(list, state);
        if (list.matches(SEL.chatList)) {
            refreshRows(list, state);
            savePosition(list, state);
            return;
        }
        if (state.atEnd) {
            scrollToEnd(list);
        } else restoreAnchor(list, state, anchor);
        refreshRows(list, state);
        savePosition(list, state);
    });
    state.resizeObserver.observe(list);
}

function observeListChanges(list, state) {
    if (state.mutationObserver) return;
    state.mutationObserver = new MutationObserver((records) => {
        if (!list.isConnected || !records.some((record) =>
            record.type === 'childList' && record.target === list)) return;

        if (list.matches(SEL.chatList)) {
            refreshRows(list, state);
            savePosition(list, state);
            return;
        }

        const anchor = state.atEnd ? null : visibleAnchor(list, state);
        if (state.atEnd) {
            scrollToEnd(list);
        } else restoreAnchor(list, state, anchor);
        refreshRows(list, state);
        savePosition(list, state);
    });
    state.mutationObserver.observe(list, { childList: true });
}

export const chatScroller = {
    start() {
        if (started) return;
        started = true;
        document.addEventListener('wheel', markUserScroll, { capture: true, passive: true });
        document.addEventListener('touchmove', markUserScroll, { capture: true, passive: true });
        document.addEventListener('pointerdown', markUserScroll, { capture: true, passive: true });
        document.addEventListener('pointermove', (event) => {
            if (event.buttons) markUserScroll(event);
        }, { capture: true, passive: true });
        document.addEventListener('keydown', (event) => {
            if (!['ArrowDown', 'ArrowUp', 'End', 'Home', 'PageDown', 'PageUp', ' '].includes(event.key)) return;
            const target = event.target;
            if (target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"]')) return;
            markUserScroll(event);
        }, true);
        document.addEventListener('scroll', (event) => {
            const list = event.target;
            if (list && list.matches && list.matches(scrollListSelector)) {
                const state = getState(list);
                const delta = list.scrollTop - state.lastScrollTop;
                for (const geometry of state.rows.values()) geometry.top -= delta;
                state.lastScrollTop = list.scrollTop;
                if (!list.matches(SEL.chatList)
                    || performance.now() <= state.userScrollUntil) updateAtEnd(list, state);
                savePosition(list, state);
            }
        }, true);
    },

    getContainer,
    isAtEnd,
    scrollToEnd,

    captureEndIntent(list) {
        const state = getState(list);
        return { atEnd: state.atEnd, userScrollVersion: state.userScrollVersion };
    },

    settleAtEnd(list, intent) {
        if (!list || !intent || !intent.atEnd) return;
        const state = getState(list);
        let frames = 18;
        const settle = () => {
            requestAnimationFrame(() => {
                if (!list.isConnected || state.userScrollVersion !== intent.userScrollVersion) return;
                scrollToEnd(list);
                state.atEnd = isAtEnd(list);
                refreshRows(list, state);
                savePosition(list, state);
                if (--frames) settle();
            });
        };
        settle();
    },

    register(list, key, restore = false) {
        if (!list) return;
        const state = getState(list);
        if (key) state.key = key;
        if (restore) restorePosition(list, state);
        observeListChanges(list, state);
        refreshRows(list, state);
        savePosition(list, state);
    },

    keep(list, mutate) {
        const state = getState(list);
        const atEnd = isAtEnd(list);
        state.atEnd = atEnd;
        const scrollTop = list.scrollTop;
        let anchor = null;
        if (!atEnd) {
            const listTop = list.getBoundingClientRect().top;
            for (const li of list.children) {
                if (li.tagName !== 'LI') continue;
                const rect = li.getBoundingClientRect();
                if (rect.bottom > listTop + 1) {
                    anchor = { li, id: li.dataset.mid, offset: rect.top - listTop };
                    break;
                }
            }
        }

        mutate();

        if (!list.isConnected) return;
        if (atEnd) {
            scrollToEnd(list);
        } else if (anchor) {
            const row = anchor.li.isConnected ? anchor.li
                : anchor.id && [...list.children].find((item) => item.dataset.mid === anchor.id);
            if (row) {
                const delta = row.getBoundingClientRect().top
                    - list.getBoundingClientRect().top - anchor.offset;
                if (Math.abs(delta) > SCROLL_CORRECTION_THRESHOLD) list.scrollTop += delta;
            } else {
                list.scrollTop = scrollTop;
            }
        } else {
            list.scrollTop = scrollTop;
        }
        refreshRows(list, state);
        savePosition(list, state);
    },

    reinitialize(list, mutate) {
        const state = getState(list);
        const scrollTop = list.scrollTop;
        const atEnd = state.atEnd;
        const result = mutate();
        if (list.isConnected) list.scrollTop = atEnd ? list.scrollHeight : scrollTop;
        refreshRows(list, state);
        savePosition(list, state);
        return result;
    },

    stickAtEnd(lists) {
        lists.forEach((list) => {
            if (getState(list).atEnd) scrollToEnd(list);
            refreshRows(list, getState(list));
            savePosition(list, getState(list));
        });
    },

    preserve(element, mutate) {
        const list = getContainer(element);
        if (!list) {
            mutate();
            return;
        }

        const state = getState(list);
        const wasAtEnd = state.atEnd;
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
        refreshRows(list, state);
        savePosition(list, state);
    }
};
