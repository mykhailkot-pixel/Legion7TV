import { scan } from './chat.js';
import { disposeInputBindings, ensureButtons } from './chatInput.js';
import { pageChan } from '../core/config.js';
import { clamp, SEL, STORE } from '../core/consts.js';
import { store } from '../core/store.js';

const CITY_CHAT_POSITION_KEY = `${STORE.cityChatPosition}:${pageChan}`;
const CITY_CHAT_DRAG_IGNORE = 'button, a, input, textarea, select, [role="tab"], [contenteditable="true"]';

function cityChatPosition(box) {
    return {
        x: Number(box.dataset.t7CityX) || 0,
        y: Number(box.dataset.t7CityY) || 0
    };
}

function applyCityChatPosition(box, x, y) {
    box.dataset.t7CityX = String(x);
    box.dataset.t7CityY = String(y);
    box.style.translate = `${x}px ${y}px`;
}

function constrainCityChatPosition(box, x, y) {
    const rect = box.getBoundingClientRect();
    const current = cityChatPosition(box);
    const left = rect.left - current.x;
    const right = rect.right - current.x;
    const top = rect.top - current.y;
    const bottom = rect.bottom - current.y;
    const bounded = (value, min, max) => max < min ? (min + max) / 2 : clamp(value, min, max);
    return {
        x: bounded(x, 8 - left, innerWidth - 8 - right),
        y: bounded(y, 8 - top, innerHeight - 8 - bottom)
    };
}

function normalizeCityChatPositions() {
    document.querySelectorAll('.cy .cy-chat[data-t7-city-movable]').forEach((box) => {
        if (!box.getClientRects().length) return;
        const current = cityChatPosition(box);
        const next = constrainCityChatPosition(box, current.x, current.y);
        if (next.x === current.x && next.y === current.y) return;
        applyCityChatPosition(box, next.x, next.y);
        store.set(CITY_CHAT_POSITION_KEY, next);
    });
}

function bindCityChatMove(box) {
    if (!box.matches('.cy .cy-chat')) return;
    const header = box.querySelector(SEL.chatHeader);
    if (!header) return;
    header.classList.add('t7-chat-drag-handle');
    if (box.dataset.t7CityMovable) return;
    box.dataset.t7CityMovable = '1';

    const saved = store.get(CITY_CHAT_POSITION_KEY);
    if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y))
        applyCityChatPosition(box, saved.x, saved.y);

    let drag = null;
    let suppressClick = false;
    box.addEventListener('pointerdown', (event) => {
        const handle = event.target.closest(SEL.chatHeader);
        if (!handle || !box.contains(handle) || event.button !== 0 || event.target.closest(CITY_CHAT_DRAG_IGNORE)) return;
        const rect = box.getBoundingClientRect();
        drag = {
            id: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            rect,
            start: cityChatPosition(box),
            moved: false
        };
        event.preventDefault();
        try { box.setPointerCapture(event.pointerId); } catch {}
    });
    box.addEventListener('pointermove', (event) => {
        if (!drag || event.pointerId !== drag.id) return;
        const dx = event.clientX - drag.x;
        const dy = event.clientY - drag.y;
        if (!drag.moved && Math.hypot(dx, dy) < 4) return;
        drag.moved = true;
        box.classList.add('t7-chat-dragging');
        const next = constrainCityChatPosition(box, drag.start.x + dx, drag.start.y + dy);
        applyCityChatPosition(box, next.x, next.y);
        event.preventDefault();
    });
    const endDrag = (event) => {
        if (!drag || event.pointerId !== drag.id) return;
        if (drag.moved) {
            store.set(CITY_CHAT_POSITION_KEY, cityChatPosition(box));
            suppressClick = true;
            setTimeout(() => { suppressClick = false; }, 0);
        }
        drag = null;
        box.classList.remove('t7-chat-dragging');
    };
    box.addEventListener('pointerup', endDrag);
    box.addEventListener('pointercancel', endDrag);
    box.addEventListener('click', (event) => {
        if (!suppressClick) return;
        event.preventDefault();
        event.stopPropagation();
        suppressClick = false;
    }, true);
}

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

    const bindCityChats = () => document.querySelectorAll('.cy .cy-chat').forEach(bindCityChatMove);

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
        bindCityChats();
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
    bindCityChats();
    window.addEventListener('resize', normalizeCityChatPositions, { passive: true });
    requestAnimationFrame(normalizeCityChatPositions);

    return () => {
        observer.disconnect();
        window.removeEventListener('resize', normalizeCityChatPositions);
        if (dmObserver) dmObserver.disconnect();
        if (dmContainer && onDmScroll) dmContainer.removeEventListener('scroll', onDmScroll);
    };
}
