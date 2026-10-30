import { SIZES } from '../core/config.js';
import { SEL } from '../core/consts.js';
import { S } from '../core/state.js';
import { processEmotes } from './chatEmotes.js';
import { processLinks } from './links.js';
import { processMentions } from './mentions.js';

const processors = [];
const SOURCE_KEY = 'l7tvEmoteSource';
export function registerChatProcessor(processor) {
    if (typeof processor === 'function' && !processors.includes(processor)) processors.push(processor);
}
registerChatProcessor(processEmotes);
registerChatProcessor(processLinks);
registerChatProcessor(processMentions);

/* ---------- не даём ленте «уползать» вверх, когда эмоуты увеличивают строки ---------- */
// scroll не всплывает, поэтому ловим в capture-фазе; программный рост высоты событие scroll не вызывает,
// так что флаг отражает только то, где ленту оставил пользователь (или игра)
document.addEventListener('scroll', (e) => {
    const t = e.target;
    if (t && t.classList && t.classList.contains('cy-chat-l'))
        t.dataset.t7end = (t.scrollHeight - t.scrollTop - t.clientHeight < 40) ? '1' : '0';
}, true);

function stickEnds(lists) {
    lists.forEach((l) => {
        if (l.dataset.t7end !== '0') l.scrollTop = l.scrollHeight;
    });
}
function stickFrom(el) {
    const l = el.closest && el.closest(SEL.chatList);
    if (l && l.dataset.t7end !== '0') l.scrollTop = l.scrollHeight;
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
    const context = { message, content, room, kind, source, stickFrom };
    for (const processor of processors) processor(context);
}

export function scan() {
    const chatFresh = document.querySelectorAll(SEL.freshChatRows);
    chatFresh.forEach((message) => processMessage(message, 'chat'));
    if (chatFresh.length) {
        const lists = new Set([...chatFresh].map((message) => message.closest(SEL.chatList)).filter(Boolean));
        stickEnds(lists);
    }

    document.querySelectorAll(SEL.freshDmRows)
        .forEach((message) => processMessage(message, 'dm'));
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