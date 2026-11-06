import { getChatTabPrefs } from '../prefs.js';
import { EV, SEL, on } from '../../core/consts.js';

const chats = new Set();

export function setupTabs(K) {
    const S = K.state();
    if (!S || !S.chat || !S.el) return;
    const C = S.chat;
    const tabs = S.el.querySelector(SEL.chatTabs);
    if (!tabs) return;
    chats.add(K);
    const prefs = getChatTabPrefs();
    for (const id of prefs.order) {
        const button = tabs.querySelector(`[data-tab="${id}"]`);
        if (!button) continue;
        button.hidden = prefs.hidden.has(id) || !C[id];
        tabs.appendChild(button);
    }
    tabs.querySelectorAll('[data-tab]').forEach((button) => {
        if (button._t7h) return;
        button._t7h = 1;
        new MutationObserver(() => {
            const hidden = getChatTabPrefs().hidden.has(button.dataset.tab) || !C[button.dataset.tab];
            if (hidden !== button.hidden) button.hidden = hidden;
        }).observe(button, { attributes: true, attributeFilter: ['hidden'] });
    });
    if (prefs.hidden.has(C.tab) || !C[C.tab]) {
        const fallback = prefs.order.find((id) => {
            const button = tabs.querySelector(`[data-tab="${id}"]`);
            return !prefs.hidden.has(id) && C[id] && button;
        });
        if (fallback) selectTab(K, fallback);
    }
    if (!tabs._t7) {
        tabs._t7 = 1;
        new MutationObserver(() => {
            const chat = K.state() && K.state().chat;
            if (tabs.hidden && chat && !chat.panel) tabs.hidden = false;
        }).observe(tabs, { attributes: true, attributeFilter: ['hidden'] });
    }
    if (!C.panel) tabs.hidden = false;
}

on(EV.chatTabsChange, () => {
    for (const K of chats) setupTabs(K);
});

function selectTab(K, id) {
    const S = K.state();
    const button = S && S.el && S.el.querySelector(`${SEL.chatTabs} [data-tab="${id}"]`);
    if (button) button.click();
}
