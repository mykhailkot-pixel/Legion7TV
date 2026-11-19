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
    return url.href;
}

let started = false;
let detachedStyleSheet = null;
const expansionRequested = new WeakSet();

function isDetachedWindow() {
    return new URL(location.href).searchParams.get(CHAT_WINDOW_QUERY) === '1';
}

function installDetachedWindowLayout() {
    const modeClass = cls('detached-chat-window');
    document.documentElement.classList.add(modeClass);

    detachedStyleSheet = new CSSStyleSheet();
    detachedStyleSheet.replaceSync(`
        html.${modeClass}, html.${modeClass} body {
            width: 100%;
            height: 100%;
            margin: 0 !important;
            overflow: hidden !important;
        }
        html.${modeClass} .cy-chat {
            position: fixed !important;
            inset: 0 !important;
            box-sizing: border-box !important;
            width: 100vw !important;
            height: 100vh !important;
            max-width: none !important;
            max-height: none !important;
            margin: 0 !important;
            z-index: 2147483640 !important;
        }
        html.${modeClass} .cy-chat-t {
            display: none !important;
        }
        html.${modeClass} .cy-chat-b:not([hidden]) {
            position: absolute !important;
            inset: 0 !important;
            box-sizing: border-box !important;
            width: auto !important;
            height: auto !important;
            max-width: none !important;
            max-height: none !important;
        }
    `);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, detachedStyleSheet];
}

function expandChat(box) {
    const body = box.querySelector('.cy-chat-b');
    const toggle = box.querySelector(SEL.chatToggleButton);
    if (!body || !toggle || expansionRequested.has(box)) return;
    if (!body.hidden && getComputedStyle(body).display !== 'none'
        && toggle.getAttribute('aria-expanded') !== 'false') return;

    expansionRequested.add(box);
    toggle.click();
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
    if (detached) installDetachedWindowLayout();

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
