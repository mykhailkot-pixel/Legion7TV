import { pingSystem } from '../pingSystem.js';

const listStates = new WeakMap();
const states = new Set();
let documentObserver = null;

function messageRows(list) {
    return [...list.children].filter((row) =>
        row.tagName === 'LI' && !row.matches('.dm-old, .dm-0'));
}

function rowKey(row) {
    return `${row.className}|${row.title}|${row.textContent}`;
}

function recipientOf(list) {
    const root = list.closest('.dm');
    const name = root && root.querySelector('.dm-who');
    if (name && name.textContent.trim()) return name.textContent.trim();
    const activeTab = root && root.querySelector('.dm-tab.on [data-dmt]');
    return activeTab && activeTab.dataset.dmt || '';
}

function updateList(state) {
    const currentRecipient = recipientOf(state.list);
    const rows = messageRows(state.list);
    const keys = rows.map(rowKey);
    if (!state.recipient || currentRecipient !== state.recipient) {
        state.recipient = currentRecipient;
        state.seen = new Set(keys);
        state.lastKey = keys[keys.length - 1] || '';
        return;
    }

    const previousLastIndex = state.lastKey ? keys.lastIndexOf(state.lastKey) : -1;
    const newRows = previousLastIndex < 0 ? [] : rows.slice(previousLastIndex + 1);
    for (const row of newRows) {
        const key = rowKey(row);
        if (state.seen.has(key)) continue;
        state.seen.add(key);
        if (row.classList.contains('me') || !pingSystem.shouldNotifyDm(currentRecipient)) continue;
        pingSystem.playDm().catch((error) =>
            console.warn('[7TV] не удалось воспроизвести звук ЛС', error));
    }

    for (const key of keys) state.seen.add(key);
    state.lastKey = keys[keys.length - 1] || '';
    if (state.seen.size > 600) state.seen = new Set(keys.slice(-300));
}

function observeList(list) {
    if (listStates.has(list)) return;
    const state = {
        list,
        observer: null,
        recipient: '',
        lastKey: '',
        seen: new Set()
    };
    state.observer = new MutationObserver(() => updateList(state));
    state.observer.observe(list, { childList: true });
    listStates.set(list, state);
    states.add(state);
    updateList(state);
}

function scan(root) {
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    if (root.matches('.dm-l')) observeList(root);
    root.querySelectorAll('.dm-l').forEach(observeList);
}

export function startDirectMessageObserver() {
    if (documentObserver || !document.documentElement) return;
    documentObserver = new MutationObserver((records) => {
        for (const record of records) {
            for (const node of record.removedNodes) {
                if (node.nodeType !== Node.ELEMENT_NODE) continue;
                for (const state of states) {
                    if ((node === state.list || node.contains(state.list)) && !state.list.isConnected) {
                        state.observer.disconnect();
                        states.delete(state);
                        listStates.delete(state.list);
                    }
                }
            }
            for (const node of record.addedNodes) scan(node);
        }
    });
    documentObserver.observe(document.documentElement, { childList: true, subtree: true });
    document.querySelectorAll('.dm-l').forEach(observeList);
}
