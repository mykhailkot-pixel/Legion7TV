import { SEL } from '../../core/consts.js';
import { cls } from '../../core/ui.js';

export const CHAT_WINDOW_QUERY = 'l7tv_chat_window';

export function buildDetachedChatUrl(value) {
    if (typeof value !== 'string' || value.length > 4096)
        throw new Error('Адрес текущей игры некорректен.');

    let url;
    try {
        url = new URL(value);
    } catch {
        throw new Error('Не удалось определить адрес текущей игры.');
    }

    if (url.origin !== 'https://legiongame.gg' || url.username || url.password)
        throw new Error('Отдельное окно чата можно открыть только на legiongame.gg.');

    url.searchParams.set(CHAT_WINDOW_QUERY, '1');
    url.hash = '';
    return url.href;
}

let started = false;
const expansionRequested = new WeakSet();

function isDetachedWindow() {
    return new URL(location.href).searchParams.get(CHAT_WINDOW_QUERY) === '1';
}

function expandChat(box) {
    const body = box.querySelector('.cy-chat-b');
    const toggle = box.querySelector(SEL.chatToggleButton);
    if (!body || !toggle || expansionRequested.has(box)) return;
    if (!body.hidden && getComputedStyle(body).display !== 'none') {
        toggle.hidden = true;
        return;
    }

    expansionRequested.add(box);
    toggle.click();
    const removeToggleWhenExpanded = () => {
        const currentBody = box.querySelector('.cy-chat-b');
        const currentToggle = box.querySelector(SEL.chatToggleButton);
        if (currentBody && currentToggle && !currentBody.hidden
            && getComputedStyle(currentBody).display !== 'none')
            currentToggle.hidden = true;
    };
    removeToggleWhenExpanded();
    requestAnimationFrame(removeToggleWhenExpanded);
}

async function openDetachedWindow(button) {
    button.disabled = true;
    try {
        const api = globalThis.browser || globalThis.chrome;
        if (!api || !api.runtime || typeof api.runtime.sendMessage !== 'function')
            throw new Error('API расширения недоступно. Перезагрузите страницу и попробуйте снова.');

        const result = await api.runtime.sendMessage({
            type: 'LEGION7TV_OPEN_CHAT_WINDOW',
            url: location.href
        });
        if (!result || !result.ok)
            throw new Error(result && result.error || 'Не удалось открыть отдельное окно чата.');
        button.title = 'Чат открыт в отдельном окне';
        button.setAttribute('aria-label', button.title);
    } catch (error) {
        button.title = error instanceof Error ? error.message : String(error);
        button.setAttribute('aria-label', button.title);
    } finally {
        button.disabled = false;
    }
}

function addDetachButton(box) {
    const header = box.querySelector(SEL.chatHeader);
    if (!header || header.querySelector(`.${cls('chat-window-button')}`)) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = cls('chat-window-button');
    button.textContent = '⧉';
    button.title = 'Открыть чат в отдельном окне';
    button.setAttribute('aria-label', button.title);
    button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        openDetachedWindow(button);
    });

    const close = header.querySelector(SEL.chatCloseButton);
    header.insertBefore(button, close || null);
}

export function startChatWindowIntegration() {
    if (started) return;
    started = true;

    const detached = isDetachedWindow();

    const update = () => {
        document.querySelectorAll(SEL.chatRoot).forEach((box) => {
            if (detached) expandChat(box);
            else addDetachButton(box);
        });
    };

    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });
    update();
}
