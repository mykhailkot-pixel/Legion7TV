import { SIZES } from '../../core/config.js';
import { SEL } from '../../core/consts.js';
import { S, st } from '../../core/state.js';
import { cls, cssVar } from '../../core/ui.js';
import { processMarkdown } from './markdown.js';
import { processEmotes } from './chatEmotes.js';
import { processLinks } from './links.js';
import { processMentions } from './mentions.js';
import { chatScroller } from './scrollState.js';
import { pingSystem } from '../pingSystem.js';
import {
    getOriginalMessageSource,
    isMessageProcessed,
    markMessageProcessed,
    unmarkMessageProcessed
} from './messageState.js';

const processors = [];
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
    if (isMessageProcessed(message) || message.matches(SEL.emptyMessage)) return;

    const kind = message.matches(SEL.systemMessage) ? 'system'
        : message.matches(SEL.eventMessage) ? 'event' : 'message';
    let content = message;
    if (kind === 'message') {
        const spans = message.querySelectorAll(SEL.messageContent);
        content = spans[spans.length - 1];
        if (!content) return;
    }

    const source = kind === 'message'
        ? getOriginalMessageSource(content, content.textContent)
        : content.textContent;
    if (kind === 'message') {
        content.replaceChildren(document.createTextNode(source));
    }

    markMessageProcessed(message);
    const context = { message, content, room, kind, source };
    for (const processor of processors) processor(context);
}

export function scan() {
    const chatFresh = [...document.querySelectorAll(SEL.chatRows)].filter((message) =>
        !isMessageProcessed(message));
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

    const dmFresh = [...document.querySelectorAll(SEL.dmRows)].filter((message) =>
        !isMessageProcessed(message));
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
    document.querySelectorAll(`${SEL.chatRows}, ${SEL.dmRows}`)
        .forEach(unmarkMessageProcessed);
    scan();
}

export const applySize = () => {
    document.querySelectorAll(`.${cls('w')}`).forEach((wrapper) => {
        wrapper.style.setProperty(cssVar('h'), SIZES[S.size].h);
    });
    if (st.pop) st.pop.style.setProperty(cssVar('tile'), SIZES[S.size].p + 'px');
};