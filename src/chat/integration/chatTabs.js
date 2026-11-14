import { getChatTabPrefs, setChatTabPrefs } from '../prefs.js';
import { EV, SEL, on } from '../../core/consts.js';
import { cls } from '../../core/ui.js';

const observers = new WeakMap();
let documentObserver = null;

function applyTabs(tabs) {
    if (!tabs.isConnected) return;
    const prefs = getChatTabPrefs();
    const buttons = [...tabs.querySelectorAll(':scope > [data-tab]')];
    if (!buttons.length) return;
    const hiddenClass = cls('pref-hidden');

    const byId = new Map(buttons.map((button) => [button.dataset.tab, button]));
    const ordered = [
        ...prefs.order.map((id) => byId.get(id)).filter(Boolean),
        ...buttons.filter((button) => !prefs.order.includes(button.dataset.tab))
    ];
    if (ordered.some((button, index) => buttons[index] !== button))
        ordered.forEach((button) => tabs.appendChild(button));

    for (const button of ordered) {
        const hidden = prefs.hidden.has(button.dataset.tab);
        button.classList.toggle(hiddenClass, hidden);
    }

    const selected = ordered.find((button) => button.getAttribute('aria-selected') === 'true');
    if (selected && prefs.hidden.has(selected.dataset.tab)) {
        const next = ordered.find((button) => !button.hidden && !prefs.hidden.has(button.dataset.tab));
        if (next) next.click();
    }
}

function syncSiteOrder(tabs) {
    const prefs = getChatTabPrefs();
    const order = [...tabs.querySelectorAll(':scope > [data-tab]')]
        .map((button) => button.dataset.tab)
        .filter((id) => prefs.order.includes(id));
    if (order.length !== prefs.order.length
        || order.every((id, index) => id === prefs.order[index])) return;
    prefs.order = order;
    setChatTabPrefs(prefs);
}

function observeTabs(tabs) {
    if (!observers.has(tabs)) {
        const observer = new MutationObserver(() => applyTabs(tabs));
        observer.observe(tabs, {
            attributes: true,
            attributeFilter: ['aria-selected', 'hidden'],
            childList: true
        });
        observers.set(tabs, observer);
        tabs.addEventListener('pointerup', () => queueMicrotask(() => syncSiteOrder(tabs)), true);
        tabs.addEventListener('keydown', (event) => {
            if ((event.altKey || (event.ctrlKey && event.shiftKey))
                && ['ArrowLeft', 'ArrowRight'].includes(event.key))
                queueMicrotask(() => syncSiteOrder(tabs));
        }, true);
    }
    applyTabs(tabs);
}

export function setupTabs(root = document) {
    root.querySelectorAll(SEL.chatTabs).forEach(observeTabs);
    if (!documentObserver && document.documentElement) {
        documentObserver = new MutationObserver((records) => {
            for (const record of records) {
                for (const node of record.addedNodes) {
                    if (node.nodeType !== Node.ELEMENT_NODE) continue;
                    if (node.matches(SEL.chatTabs)) observeTabs(node);
                    node.querySelectorAll(SEL.chatTabs).forEach(observeTabs);
                }
            }
        });
        documentObserver.observe(document.documentElement, { childList: true, subtree: true });
    }
}

on(EV.chatTabsChange, () => setupTabs());
