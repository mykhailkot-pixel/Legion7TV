import { EMOTE_LINE_SPACING, SIZES } from '../../core/config.js';
import { SEL } from '../../core/consts.js';
import { EM, S, st } from '../../core/state.js';
import { cls, cssVar } from '../../core/ui.js';
import { processMarkdown } from './markdown.js';
import { extractNativeEmotes, restoreNativeEmotes } from './chatEmotes.js';
import { processLinks } from './links.js';
import { processMentions } from './mentions.js';
import { chatScroller } from './scrollState.js';
import { setEmoteTooltipData } from '../../emotes/tooltip.js';
import {
    getOriginalMessageSource,
    isMessageProcessed,
    markMessageProcessed,
    unmarkMessageProcessed
} from './messageState.js';

const processors = [];
const emoteRowLineHeights = new WeakMap();
export function registerChatProcessor(processor) {
    if (typeof processor === 'function' && !processors.includes(processor)) processors.push(processor);
}
registerChatProcessor(processMarkdown);
registerChatProcessor(processLinks);
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

    const nativeEmotes = kind === 'message' ? extractNativeEmotes(content) : null;
    const source = kind === 'message'
        ? getOriginalMessageSource(content, nativeEmotes.source)
        : content.textContent;
    if (kind === 'message') {
        content.replaceChildren(document.createTextNode(source));
    }

    markMessageProcessed(message);
    const context = { message, content, room, kind, source };
    for (const processor of processors) processor(context);
    if (kind === 'message') {
        restoreNativeEmotes(content, nativeEmotes.images);
        nativeEmotes.images.forEach(applyNativeEmote);
    }
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

export function refreshEmotes() {
    document.querySelectorAll(`${SEL.chatRows} img.cy-emo, ${SEL.dmRows} img.cy-emo`)
        .forEach(applyNativeEmote);
}

function applyNativeEmote(image) {
    image.classList.toggle(cls('native-emote-hidden'), !S.on);
    image.style.height = SIZES[S.size].h;
    image.style.width = 'auto';
    const row = image.closest('li');
    if (row) {
        let lineHeight = emoteRowLineHeights.get(row);
        if (!S.on) {
            if (lineHeight) {
                row.style.lineHeight = lineHeight.inline;
                emoteRowLineHeights.delete(row);
            }
        } else {
            const fontSize = parseFloat(getComputedStyle(row).fontSize);
            if (!lineHeight) {
                const computedLineHeight = parseFloat(getComputedStyle(row).lineHeight);
                lineHeight = {
                    inline: row.style.lineHeight,
                    siteRatio: Number.isFinite(computedLineHeight) && fontSize > 0
                        ? computedLineHeight / fontSize : 1.2
                };
                emoteRowLineHeights.set(row, lineHeight);
            }
            const emoteHeight = parseFloat(SIZES[S.size].h);
            const baseRatio = Math.max(lineHeight.siteRatio, Number.isFinite(emoteHeight) ? emoteHeight : 0);
            if (Number.isFinite(fontSize) && fontSize > 0)
                row.style.lineHeight = String(baseRatio * EMOTE_LINE_SPACING);
        }
    }
    if (image.alt) setEmoteTooltipData(image, image.alt, EM[image.alt]);
}

export const applySize = () => {
    document.querySelectorAll(`${SEL.chatRows} img.cy-emo, ${SEL.dmRows} img.cy-emo`)
        .forEach(applyNativeEmote);
    if (st.pop) st.pop.style.setProperty(cssVar('tile'), SIZES[S.size].p + 'px');
};