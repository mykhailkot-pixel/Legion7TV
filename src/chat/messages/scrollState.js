import { SEL } from '../../core/consts.js';

const scrollListSelector = `${SEL.chatList}, .dm-l`;
const states = new WeakMap();
const savedPositions = new Map();
const END_THRESHOLD = 40;
const CHANGE_THRESHOLD = 0.5;
const MAX_SAVED_POSITIONS = 20;
let started = false;

function getContainer(element) {
    return element && element.closest ? element.closest(scrollListSelector) : null;
}

function maxScrollTop(list) {
    return Math.max(0, list.scrollHeight - list.clientHeight);
}

function isAtEnd(list) {
    return maxScrollTop(list) - list.scrollTop <= END_THRESHOLD;
}

function getRows(list) {
    return [...list.children].filter((child) => child.tagName === 'LI');
}

function getState(list) {
    let state = states.get(list);
    if (!state) {
        state = {
            atEnd: isAtEnd(list),
            anchor: null,
            rows: new Set(),
            resizeObserver: null,
            mutationObserver: null,
            key: null,
            userScrollVersion: 0,
            lastScrollTop: list.scrollTop
        };
        states.set(list, state);
    }
    return state;
}

function findVisibleAnchor(list, rows = getRows(list)) {
    const listTop = list.getBoundingClientRect().top;
    const listBottom = listTop + list.clientHeight;
    for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        const rect = row.getBoundingClientRect();
        if (rect.height && rect.bottom > listTop && rect.top < listBottom) {
            return {
                row,
                id: row.dataset.mid || '',
                index,
                offset: rect.top - listTop
            };
        }
    }
    return null;
}

function findAnchorRow(list, anchor, oldRows) {
    const rows = getRows(list);
    if (anchor.row.isConnected && list.contains(anchor.row)) return anchor.row;
    if (anchor.id) {
        const match = rows.find((row) => row.dataset.mid === anchor.id);
        if (match) return match;
    }
    for (let index = anchor.index + 1; index < oldRows.length; index++) {
        const row = oldRows[index];
        if (row.isConnected && list.contains(row)) return row;
    }
    for (let index = anchor.index - 1; index >= 0; index--) {
        const row = oldRows[index];
        if (row.isConnected && list.contains(row)) return row;
    }
    return rows[Math.min(anchor.index, rows.length - 1)] || null;
}

function restoreAnchor(list, anchor, oldRows) {
    if (!anchor) return;
    const row = findAnchorRow(list, anchor, oldRows);
    if (!row) return;
    const offset = row.getBoundingClientRect().top - list.getBoundingClientRect().top;
    const delta = offset - anchor.offset;
    if (Math.abs(delta) > CHANGE_THRESHOLD) list.scrollTop += delta;
}

function savePosition(list, state) {
    if (!state.key || !list.clientHeight) return;
    savedPositions.delete(state.key);
    savedPositions.set(state.key, {
        top: list.scrollTop,
        atEnd: state.atEnd,
        anchorId: state.anchor && state.anchor.id,
        anchorOffset: state.anchor && state.anchor.offset
    });
    while (savedPositions.size > MAX_SAVED_POSITIONS) {
        savedPositions.delete(savedPositions.keys().next().value);
    }
}

function observeRows(list, state, rows = getRows(list)) {
    if (!state.resizeObserver) return;
    const currentRows = new Set(rows);
    for (const row of state.rows) {
        if (!currentRows.has(row)) state.resizeObserver.unobserve(row);
    }
    for (const row of currentRows) {
        if (!state.rows.has(row)) state.resizeObserver.observe(row);
    }
    state.rows = currentRows;
}

function commit(list, state) {
    const rows = getRows(list);
    observeRows(list, state, rows);
    state.anchor = findVisibleAnchor(list, rows);
    state.lastScrollTop = list.scrollTop;
    savePosition(list, state);
}

function scrollToEnd(list) {
    const target = maxScrollTop(list);
    if (Math.abs(list.scrollTop - target) > CHANGE_THRESHOLD) list.scrollTop = target;
}

function preserveAfterLayoutChange(list, state) {
    if (!list.isConnected) return;
    const previousRows = [...state.rows];
    if (state.atEnd) scrollToEnd(list);
    else restoreAnchor(list, state.anchor, previousRows);
    commit(list, state);
}

function setupObservers(list, state) {
    if (!state.resizeObserver) {
        state.resizeObserver = new ResizeObserver(() => preserveAfterLayoutChange(list, state));
        state.resizeObserver.observe(list);
    }
    if (!state.mutationObserver) {
        state.mutationObserver = new MutationObserver((records) => {
            if (records.some((record) => record.target === list && record.type === 'childList')) {
                preserveAfterLayoutChange(list, state);
            }
        });
        state.mutationObserver.observe(list, { childList: true });
    }
}

function register(list, key, restore) {
    if (!list) return;
    const state = getState(list);
    if (key) state.key = key;
    setupObservers(list, state);
    if (restore && state.key) {
        const saved = savedPositions.get(state.key);
        if (saved) {
            state.atEnd = saved.atEnd;
            if (saved.atEnd) {
                scrollToEnd(list);
            } else {
                const row = saved.anchorId && getRows(list).find((item) => item.dataset.mid === saved.anchorId);
                if (row) {
                    const offset = row.getBoundingClientRect().top - list.getBoundingClientRect().top;
                    list.scrollTop += offset - saved.anchorOffset;
                } else {
                    list.scrollTop = Math.min(saved.top, maxScrollTop(list));
                }
            }
        }
    }
    commit(list, state);
}

function updateFromScroll(list) {
    const state = getState(list);
    state.atEnd = isAtEnd(list);
    commit(list, state);
}

function markUserScroll(event) {
    const list = getContainer(event.target);
    if (!list) return;
    const state = getState(list);
    state.userScrollVersion++;
}

function captureAnchor(list) {
    const rows = getRows(list);
    return { anchor: findVisibleAnchor(list, rows), rows };
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
            if (list && list.matches && list.matches(scrollListSelector)) updateFromScroll(list);
        }, true);
    },

    getContainer,
    isAtEnd,

    scrollToEnd(list) {
        if (!list) return;
        const state = getState(list);
        state.atEnd = true;
        scrollToEnd(list);
        commit(list, state);
    },

    captureEndIntent(list) {
        if (!list) return null;
        const state = getState(list);
        return { atEnd: state.atEnd || isAtEnd(list), userScrollVersion: state.userScrollVersion };
    },

    settleAtEnd(list, intent) {
        if (!list || !intent || !intent.atEnd) return;
        const state = getState(list);
        let frames = 18;
        const settle = () => {
            requestAnimationFrame(() => {
                if (!list.isConnected || state.userScrollVersion !== intent.userScrollVersion) return;
                state.atEnd = true;
                scrollToEnd(list);
                commit(list, state);
                if (--frames) settle();
            });
        };
        settle();
    },

    register,

    keep(list, mutate) {
        if (!list) return mutate();
        const state = getState(list);
        const { anchor, rows } = captureAnchor(list);
        const atEnd = state.atEnd || isAtEnd(list);
        state.atEnd = atEnd;
        const result = mutate();
        if (!list.isConnected) return result;
        if (atEnd) scrollToEnd(list);
        else restoreAnchor(list, anchor, rows);
        commit(list, state);
        return result;
    },

    reinitialize(list, mutate) {
        if (!list) return mutate();
        const state = getState(list);
        const { anchor, rows } = captureAnchor(list);
        const atEnd = state.atEnd || isAtEnd(list);
        const result = mutate();
        if (list.isConnected) {
            state.atEnd = atEnd;
            if (atEnd) scrollToEnd(list);
            else restoreAnchor(list, anchor, rows);
            commit(list, state);
        }
        return result;
    },

    stickAtEnd(lists) {
        lists.forEach((list) => {
            const state = getState(list);
            if (state.atEnd) scrollToEnd(list);
            commit(list, state);
        });
    },

    preserve(element, mutate) {
        const list = getContainer(element);
        if (!list) return mutate();
        return this.keep(list, mutate);
    }
};
