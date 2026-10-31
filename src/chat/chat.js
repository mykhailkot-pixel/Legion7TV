import { SIZES } from '../core/config.js';
import { SEL } from '../core/consts.js';
import { S } from '../core/state.js';
import { processEmotes } from './chatEmotes.js';
import { processLinks } from './links.js';
import { processMentions } from './mentions.js';
import { getScrollContainer, getScrollState, isAtEnd, scrollToEnd } from './scrollState.js';
import { pingSystem } from './pingSystem.js';

const processors = [];
const SOURCE_KEY = 'l7tvEmoteSource';
export function registerChatProcessor(processor) {
    if (typeof processor === 'function' && !processors.includes(processor)) processors.push(processor);
}
registerChatProcessor(processEmotes);
registerChatProcessor(processLinks);
registerChatProcessor(processMentions);

/* ---------- сохраняем положение ленты при обновлении сообщений ---------- */
const scrollListSelector = `${SEL.chatList}, .cy-chat-dmx, .dm-l`;
let initializedDmLists = new WeakSet();
const seenDmMessages = new Set();

function dmMessageKey(message) {
    const sender = message.querySelector('[data-nick], [data-login], b')?.dataset.nick
        || message.querySelector('[data-login]')?.dataset.login
        || message.querySelector('b')?.textContent.trim().toLowerCase()
        || '';
    const time = message.querySelector('time[datetime]')?.dateTime
        || message.querySelector('[data-time]')?.dataset.time
        || '';
    const id = message.dataset.id || message.getAttribute('data-id') || '';
    return id ? `id:${id}` : `${sender}|${time}|${message.textContent.trim()}`;
}

function rememberDmMessage(key) {
    if (!key || seenDmMessages.has(key)) return false;
    seenDmMessages.add(key);
    if (seenDmMessages.size > 500) seenDmMessages.delete(seenDmMessages.values().next().value);
    return true;
}

function processDmMessage(message, isInitial) {
    const key = dmMessageKey(message);
    const isNew = rememberDmMessage(key);
    processMessage(message, 'dm');
    if (isInitial || !isNew || message.matches(SEL.emptyMessage)) return;

    const nickElement = message.querySelector('[data-nick], [data-login], b');
    const sender = nickElement && (nickElement.dataset.nick || nickElement.dataset.login || nickElement.textContent);
    if (pingSystem.shouldNotifyDm(sender)) {
        pingSystem.playDm().catch((error) => console.warn('[7TV] не удалось воспроизвести звук ЛС', error));
    }
}

document.addEventListener('scroll', (event) => {
    const list = getScrollContainer(event.target);
    if (!list || !list.matches(scrollListSelector)) return;
    getScrollState(list).atEnd = isAtEnd(list);
}, true);

function stickEnds(lists) {
    lists.forEach((list) => {
        const state = getScrollState(list);
        if (state.atEnd) scrollToEnd(list);
    });
}

function processMessage(message, room) {
    if (message.dataset.l7tvProcessed || message.matches(SEL.emptyMessage)) return;

    const kind = message.matches(SEL.systemMessage) ? 'system'
        : message.matches(SEL.eventMessage) ? 'event' : 'message';
    let content = message;
    if (kind === 'message') {
        const spans = message.querySelectorAll(SEL.messageContent);
        content = spans[spans.length - 1];
        if (!content) return;
    }

    const source = kind === 'message'
        ? content.dataset[SOURCE_KEY] != null
            ? content.dataset[SOURCE_KEY]
            : content.dataset.t7o != null ? content.dataset.t7o : content.textContent
        : content.textContent;
    if (kind === 'message') {
        content.dataset[SOURCE_KEY] = source;
        content.replaceChildren(document.createTextNode(source));
    }

    message.dataset.l7tvProcessed = '1';
    const context = { message, content, room, kind, source };
    for (const processor of processors) processor(context);
}

export function scan() {
    const chatFresh = document.querySelectorAll(SEL.freshChatRows);
    const chatLists = new Set([...chatFresh].map((message) => message.closest(SEL.chatList)).filter(Boolean));
    chatLists.forEach(getScrollState);
    chatFresh.forEach((message) => processMessage(message, 'chat'));
    if (chatLists.size) stickEnds(chatLists);

    const dmFresh = document.querySelectorAll(SEL.freshDmRows);
    const dmLists = new Set([...dmFresh].map((message) =>
        message.closest('.dm-l') || message.closest('.cy-chat-dmx')).filter(Boolean));
    const dmScrollLists = new Set([...dmLists].map(getScrollContainer).filter(Boolean));
    dmScrollLists.forEach(getScrollState);
    for (const list of dmLists) {
        const isInitial = !initializedDmLists.has(list);
        initializedDmLists.add(list);
        dmFresh.forEach((message) => {
            const messageList = message.closest('.dm-l') || message.closest('.cy-chat-dmx');
            if (messageList === list) processDmMessage(message, isInitial);
        });
    }
    if (dmScrollLists.size) stickEnds(dmScrollLists);
}

export function resetDmNotificationBaseline() {
    initializedDmLists = new WeakSet();
}

export function rescanAll() {
    document.querySelectorAll(`${SEL.processedChatRows}, ${SEL.processedDmRows}`)
        .forEach((message) => { delete message.dataset.l7tvProcessed; });
    scan();
}

export const applySize = () => {
    document.documentElement.style.setProperty('--t7-h', SIZES[S.size].h);
    document.documentElement.style.setProperty('--t7-tile', SIZES[S.size].p + 'px');
};