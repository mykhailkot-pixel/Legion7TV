import { scan } from './chat.js';
import { disposeInputBindings, ensureButtons } from './chatInput.js';
import { SEL } from '../core/consts.js';

function contains(node, selector) {
    return node.nodeType === 1 && (node.matches(selector) || node.querySelector(selector));
}

export function startChatObservers() {
    let queued = false;
    let needsButtons = false;
    let needsScan = false;
    let dmContainer = null;
    let dmObserver = null;
    let onDmScroll = null;

    const bindDmScrollGuard = () => {
        const next = document.querySelector(SEL.dmRoot);
        if (next === dmContainer) return;

        if (dmObserver) dmObserver.disconnect();
        if (dmContainer && onDmScroll) dmContainer.removeEventListener('scroll', onDmScroll);
        dmContainer = next;
        dmObserver = null;
        onDmScroll = null;
        if (!dmContainer) return;

        let lastScrollTop = dmContainer.scrollTop;
        onDmScroll = () => { lastScrollTop = dmContainer.scrollTop; };
        dmContainer.addEventListener('scroll', onDmScroll, { passive: true });
        dmObserver = new MutationObserver(() => {
            if (dmContainer.scrollTop < lastScrollTop - 2 && dmContainer.scrollTop > 10)
                dmContainer.scrollTop = lastScrollTop;
        });
        dmObserver.observe(dmContainer, { childList: true, subtree: true });
    };

    const schedule = (records) => {
        bindDmScrollGuard();
        for (const record of records) {
            if (record.type !== 'childList') continue;
            for (const node of record.removedNodes) disposeInputBindings(node);
            const target = record.target.nodeType === 1 ? record.target : record.target.parentElement;
            const form = target && target.closest(SEL.chatForms);
            if (form && form.querySelector(SEL.textInput))
                needsButtons = true;
            if (target && target.closest(SEL.chatRoot)) needsScan = true;

            for (const node of record.addedNodes) {
                if (contains(node, SEL.chatForms)) needsButtons = true;
                if (contains(node, SEL.chatRows) || contains(node, SEL.dmRoot)) needsScan = true;
            }
        }

        if ((!needsButtons && !needsScan) || queued) return;
        queued = true;
        requestAnimationFrame(() => {
            queued = false;
            const addButtons = needsButtons;
            const scanMessages = needsScan;
            needsButtons = false;
            needsScan = false;
            if (addButtons) ensureButtons();
            if (scanMessages) scan();
        });
    };

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    bindDmScrollGuard();

    return () => {
        observer.disconnect();
        if (dmObserver) dmObserver.disconnect();
        if (dmContainer && onDmScroll) dmContainer.removeEventListener('scroll', onDmScroll);
    };
}
