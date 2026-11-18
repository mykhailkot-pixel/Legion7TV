import { scan } from '../messages/chat.js';
import { disposeInputBindings, ensureButtons } from './chatInput.js';
import { SEL } from '../../core/consts.js';

const seenMessageIds = new WeakMap();

function contains(node, selector) {
    return node.nodeType === 1 && (node.matches(selector) || node.querySelector(selector));
}

function seedSeenMessageIds(list) {
    const ids = new Set();
    for (const row of list.children) {
        if (row.matches('li[data-mid]')) ids.add(row.dataset.mid);
    }
    seenMessageIds.set(list, ids);
}

function markRecreatedMessages(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const rows = [];
    if (node.matches(SEL.chatRows)) rows.push(node);
    rows.push(...node.querySelectorAll(SEL.chatRows));

    const rowsByList = new Map();
    for (const row of rows) {
        const list = row.closest(SEL.chatList);
        if (!list) continue;
        if (!rowsByList.has(list)) rowsByList.set(list, []);
        rowsByList.get(list).push(row);
    }

    for (const [list, addedRows] of rowsByList) {
        let ids = seenMessageIds.get(list);
        if (!ids) {
            seedSeenMessageIds(list);
            continue;
        }
        for (const row of addedRows) {
            const id = row.dataset.mid;
            if (!id) continue;
            if (ids.has(id)) row.setAttribute('data-t7-reused-message', '');
            else ids.add(id);
        }
    }
}

export function startChatObservers() {
    let buttonsQueued = false;
    let needsButtons = false;
    let needsScan = false;

    document.querySelectorAll(SEL.chatList).forEach(seedSeenMessageIds);

    const schedule = (records) => {
        for (const record of records) {
            if (record.type !== 'childList') continue;
            for (const node of record.removedNodes) {
                disposeInputBindings(node);
            }
            const target = record.target.nodeType === 1 ? record.target : record.target.parentElement;
            const form = target && target.closest(SEL.chatForms);
            if (form && form.querySelector(SEL.textInput))
                needsButtons = true;
            if (target && target.closest(SEL.chatRoot)) needsScan = true;

            for (const node of record.addedNodes) {
                markRecreatedMessages(node);
                if (contains(node, SEL.chatForms)) needsButtons = true;
                if (contains(node, SEL.chatRows) || contains(node, SEL.dmRows) || contains(node, SEL.dmRoot)) needsScan = true;
            }
        }

        if (needsScan) {
            needsScan = false;
            scan();
        }
        if (!needsButtons || buttonsQueued) return;
        buttonsQueued = true;
        requestAnimationFrame(() => {
            buttonsQueued = false;
            needsButtons = false;
            ensureButtons();
        });
    };

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
        observer.disconnect();
    };
}
