import { insertText } from '../../core/insertText.js';
import { store } from '../../core/store.js';
import { STORE } from '../../core/consts.js';
import { cls } from '../../core/ui.js';
import { getDeletedMessagesLimit } from '../integration/chatPings.js';

const REPLY_PREFIX = /^\[reply:([^\]\s]{1,200})\]\s*/u;
const REPLY_TARGETS_KEY = STORE.replyTargets;
const REPLY_TARGET_ROOMS = ['city', 'mine', 'one'];

function replyTargetKey(room, id) {
    return `${room}:${id}`;
}

function saveReplyTargets(targets) {
    store.set(REPLY_TARGETS_KEY, Object.fromEntries(targets));
}

function trimReplyTargetMap(targets, limit) {
    let changed = false;
    for (const room of REPLY_TARGET_ROOMS) {
        const entries = [...targets.entries()].filter(([, message]) => message.room === room);
        while (entries.length > limit) {
            const [key] = entries.shift();
            targets.delete(key);
            changed = true;
        }
    }
    return changed;
}

function readReplyTargets() {
    const saved = store.get(REPLY_TARGETS_KEY);
    const targets = new Map();
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
        for (const message of Object.values(saved)) {
            if (!message || typeof message !== 'object'
                || !REPLY_TARGET_ROOMS.includes(message.room)
                || typeof message.id !== 'string' || !message.id || message.id.length > 200
                || typeof message.login !== 'string' || !message.login
                || typeof message.name !== 'string' || typeof message.text !== 'string') continue;
            targets.set(replyTargetKey(message.room, message.id), {
                room: message.room,
                id: message.id,
                login: message.login.slice(0, 64),
                name: message.name.slice(0, 128),
                text: message.text.slice(0, 2000)
            });
        }
    }
    if (trimReplyTargetMap(targets, getDeletedMessagesLimit())) saveReplyTargets(targets);
    return targets;
}

const replyTargets = readReplyTargets();

export function trimSavedReplyTargets() {
    if (trimReplyTargetMap(replyTargets, getDeletedMessagesLimit()))
        saveReplyTargets(replyTargets);
}

function getMessageRoom(message) {
    const box = message.closest('.cy-chat');
    if (box && box.closest('.co-host, .co-float')) return 'one';
    if (message.dataset.rm === 'mine' || (box && box.closest('.mn'))) return 'mine';
    return 'city';
}

function visibleText(content) {
    const copy = content.cloneNode(true);
    copy.querySelectorAll('img').forEach((image) =>
        image.replaceWith(document.createTextNode(image.alt || '')));
    return String(copy.textContent || '').replace(/\s+/gu, ' ').trim();
}

function saveReplyTarget(target, room, id) {
    const key = replyTargetKey(room, id);
    const existing = replyTargets.get(key);
    if (existing && existing.name && existing.text) return existing;
    const nick = target.querySelector(':scope > b[data-nick]');
    const content = target.querySelector(':scope > span:not([class])');
    if (!nick || !content) return null;

    const login = String(nick.dataset.nick || '').trim().slice(0, 64);
    if (!login) return null;
    const text = visibleText(content);
    const nestedReply = REPLY_PREFIX.exec(text);
    const message = {
        room,
        id,
        login,
        name: (nick.textContent.trim() || login).slice(0, 128),
        text: text.slice(nestedReply ? nestedReply[0].length : 0, 2000)
    };
    replyTargets.set(key, message);
    trimSavedReplyTargets();
    return replyTargets.get(key) || message;
}

function findSavedReplyTarget(room, id) {
    const exact = replyTargets.get(replyTargetKey(room, id));
    if (exact) return exact;
    const matches = [...replyTargets.values()].filter((message) => message.id === id);
    return matches.length === 1 ? matches[0] : null;
}

function findReplyTarget(message, id) {
    const list = message.closest('.cy-chat-l');
    if (!list) return null;
    return [...list.querySelectorAll(':scope > li[data-mid]')]
        .find((row) => row !== message && row.dataset.mid === id) || null;
}

function scrollToReplyTarget(list, target) {
    const listRect = list.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const offset = targetRect.top - listRect.top;
    list.scrollTo({
        top: list.scrollTop + offset - Math.max(0, (list.clientHeight - targetRect.height) / 2),
        behavior: 'smooth'
    });
    target.classList.add(cls('reply-target-highlight'));
    setTimeout(() => target.classList.remove(cls('reply-target-highlight')), 1400);
}

function createReplyQuote(message, id) {
    const quote = document.createElement('button');
    quote.type = 'button';
    quote.className = cls('reply-quote');
    quote.setAttribute('aria-label', `Перейти к сообщению ${id}`);

    const icon = document.createElement('span');
    icon.className = cls('reply-quote-icon');
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '↪';

    const room = getMessageRoom(message);
    const target = findReplyTarget(message, id);
    const savedTarget = target
        ? saveReplyTarget(target, room, id)
        : findSavedReplyTarget(room, id);
    const nameText = document.createElement('span');
    nameText.className = cls('reply-quote-name');
    nameText.textContent = savedTarget ? savedTarget.name : 'Ответ на сообщение';

    const preview = document.createElement('span');
    preview.className = cls('reply-quote-preview');
    if (savedTarget) {
        preview.textContent = savedTarget.text || `#${id}`;
    } else {
        preview.textContent = `#${id}`;
    }
    quote.append(icon, nameText, preview);

    if (target) {
        quote.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            const list = message.closest('.cy-chat-l');
            if (list && target.isConnected && list.contains(target))
                scrollToReplyTarget(list, target);
        });
    } else {
        quote.disabled = true;
    }

    message.prepend(quote);
}

function createReplyButton(message, id) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = cls('chat-reply');
    button.title = 'Ответить на сообщение';
    button.setAttribute('aria-label', 'Ответить на сообщение');
    button.textContent = '↩';
    button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const input = message.closest('.cy-chat')?.querySelector('.cy-chat-f input');
        if (!input || input.disabled) return;
        saveReplyTarget(message, getMessageRoom(message), id);
        const existingReply = REPLY_PREFIX.exec(input.value);
        const prefix = `[reply:${id}] `;
        const inserted = insertText(input, prefix, {
            replaceRange: { start: 0, end: existingReply ? existingReply[0].length : 0 }
        });
        if (!inserted) return;
        input.focus({ preventScroll: true });
        input.setSelectionRange(input.value.length, input.value.length);
    });
    message.appendChild(button);
}

export function processReplies(context) {
    const { message, content, kind, room } = context;
    if (kind !== 'message' || room === 'dm') return;

    message.querySelector(`:scope > .${cls('reply-quote')}`)?.remove();
    message.querySelector(`:scope > .${cls('chat-reply')}`)?.remove();
    message.classList.remove(cls('reply-action-row'));

    const match = REPLY_PREFIX.exec(context.source);
    if (match) {
        const id = match[1];
        context.source = context.source.slice(match[0].length);
        content.replaceChildren(document.createTextNode(context.source));
        createReplyQuote(message, id);
    }

    if (message.dataset.mid) {
        message.classList.add(cls('reply-action-row'));
        createReplyButton(message, message.dataset.mid);
    }
}
