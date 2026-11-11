import { getChatTabPrefs } from '../prefs.js';
import { EV, SEL, on } from '../../core/consts.js';

const observers = new WeakMap();
const failedFallbacks = new WeakMap();
let documentObserver = null;

function applyTabs(tabs) {
    if (!tabs.isConnected) return;
    const prefs = getChatTabPrefs();
    const buttons = [...tabs.querySelectorAll(':scope > [data-tab]')];
    if (!buttons.length) return;

    const byId = new Map(buttons.map((button) => [button.dataset.tab, button]));
    const ordered = [
        ...prefs.order.map((id) => byId.get(id)).filter(Boolean),
        ...buttons.filter((button) => !prefs.order.includes(button.dataset.tab))
    ];
    if (ordered.some((button, index) => buttons[index] !== button))
        ordered.forEach((button) => tabs.appendChild(button));

    for (const button of ordered) {
        const hidden = prefs.hidden.has(button.dataset.tab);
        button.classList.toggle('t7-pref-hidden', hidden);
    }

    const active = ordered.find((button) => button.getAttribute('aria-selected') === 'true');
    if (!active || !prefs.hidden.has(active.dataset.tab)) {
        failedFallbacks.delete(tabs);
        return;
    }
    const fallback = ordered.find((button) =>
        !prefs.hidden.has(button.dataset.tab) && !button.hidden && !button.disabled);
    if (!fallback || failedFallbacks.get(tabs) === active.dataset.tab) return;
    failedFallbacks.set(tabs, active.dataset.tab);
    fallback.click();
}

function observeTabs(tabs) {
    if (observers.has(tabs)) return;
    const observer = new MutationObserver(() => applyTabs(tabs));
    observer.observe(tabs, {
        attributes: true,
        attributeFilter: ['aria-selected', 'hidden'],
        childList: true
    });
    observers.set(tabs, observer);
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
