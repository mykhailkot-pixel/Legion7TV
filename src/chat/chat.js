import { SIZES } from '../core/config.js';
import { SEL } from '../core/consts.js';
import { S } from '../core/state.js';
import { processMarkdown } from './markdown.js';
import { processEmotes } from './chatEmotes.js';
import { processLinks } from './links.js';
import { processMentions } from './mentions.js';
import { chatScroller } from './scrollState.js';
import { pingSystem } from './pingSystem.js';

const processors = [];
const SOURCE_KEY = 'l7tvEmoteSource';
export function registerChatProcessor(processor) {
    if (typeof processor === 'function' && !processors.includes(processor)) processors.push(processor);
}
registerChatProcessor(processMarkdown);
registerChatProcessor(processLinks);
registerChatProcessor(processEmotes);
registerChatProcessor(processMentions);

/* ---------- сохраняем положение ленты при обновлении сообщений ---------- */
let initializedDmLists = new WeakSet();

function processDmMessage(message, isInitial) {
    processMessage(message, 'dm');
}

chatScroller.start();

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
    const chatLists = new Map();
    chatFresh.forEach((message) => {
        const list = message.closest(SEL.chatList);
        if (!list) return;
        if (!chatLists.has(list)) chatLists.set(list, []);
        chatLists.get(list).push(message);
    });
    for (const [list, messages] of chatLists) {
        chatScroller.register(list);
        chatScroller.keep(list, () => messages.forEach((message) => processMessage(message, 'chat')));
    }

    const dmFresh = document.querySelectorAll(SEL.freshDmRows);
    const dmLists = new Set([...dmFresh].map((message) =>
        message.closest('.dm-l') || message.closest('.cy-chat-dmx')).filter(Boolean));
    const scrollLists = new Set([...dmLists].filter((list) => list.matches('.dm-l')));
    scrollLists.forEach((list) => chatScroller.register(list));
    const dmWasAtEnd = new Set([...scrollLists].filter((list) => chatScroller.isAtEnd(list)));
    for (const list of dmLists) {
        const isInitial = !initializedDmLists.has(list);
        const messages = [...dmFresh].filter((message) =>
            (message.closest('.dm-l') || message.closest('.cy-chat-dmx')) === list);
        if (!isInitial || messages.some((message) => !message.matches(SEL.emptyMessage))) {
            initializedDmLists.add(list);
        }
        messages.forEach((message) => processDmMessage(message, isInitial));
    }
    dmWasAtEnd.forEach((list) => {
        if (list.isConnected) chatScroller.scrollToEnd(list);
    });
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