import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    start: vi.fn(),
    register: vi.fn(),
    keep: vi.fn((_list, mutate) => mutate()),
    isAtEnd: vi.fn(() => false),
    scrollToEnd: vi.fn(),
    extractNativeEmotes: vi.fn((content) => ({ source: content.textContent, images: [] })),
    restoreNativeEmotes: vi.fn(),
    processMarkdown: vi.fn(),
    processLinks: vi.fn(),
    processMentions: vi.fn()
}));
vi.mock('../src/chat/messages/scrollState.js', () => ({
    chatScroller: {
        start: mocks.start,
        register: mocks.register,
        keep: mocks.keep,
        isAtEnd: mocks.isAtEnd,
        scrollToEnd: mocks.scrollToEnd
    }
}));
vi.mock('../src/core/ui.js', () => ({
    cls: (name) => `ext-${name}`,
    cssVar: (name) => `--ext-${name}`
}));
vi.mock('../src/emotes/tooltip.js', () => ({ setEmoteTooltipData: vi.fn() }));
vi.mock('../src/chat/messages/markdown.js', () => ({ processMarkdown: mocks.processMarkdown }));
vi.mock('../src/chat/messages/links.js', () => ({ processLinks: mocks.processLinks }));
vi.mock('../src/chat/messages/chatEmotes.js', () => ({
    extractNativeEmotes: mocks.extractNativeEmotes,
    restoreNativeEmotes: mocks.restoreNativeEmotes
}));
vi.mock('../src/chat/messages/mentions.js', () => ({ processMentions: mocks.processMentions }));
import { registerChatProcessor, refreshEmotes, rescanAll, scan } from '../src/chat/messages/chat.js';
import { isMessageProcessed } from '../src/chat/messages/messageState.js';
import { S } from '../src/core/state.js';

describe('chat message processing pipeline', () => {
    it('processes fresh chat rows once and can explicitly rescan transformed content', () => {
        const list = document.createElement('ul');
        list.className = 'cy-chat-l';
        const row = document.createElement('li');
        row.dataset.mid = '42';
        const nick = document.createElement('b');
        nick.dataset.nick = 'alice';
        nick.textContent = 'Alice';
        const content = document.createElement('span');
        content.textContent = 'hello';
        row.append(nick, content);
        list.append(row);
        document.body.append(list);

        const customProcessor = vi.fn(({ content: messageContent, source }) => {
            messageContent.textContent = `${source}!`;
        });
        registerChatProcessor(customProcessor);

        scan();
        expect(isMessageProcessed(row)).toBe(true);
        expect(content.textContent).toBe('hello!');
        expect(customProcessor).toHaveBeenCalledOnce();
        expect(mocks.register).toHaveBeenCalledWith(list);

        scan();
        expect(customProcessor).toHaveBeenCalledOnce();
        rescanAll();
        expect(customProcessor).toHaveBeenCalledTimes(2);
        expect(content.textContent).toBe('hello!');
    });

    it('adds spacing only to the line containing an emote', () => {
        const list = document.createElement('ul');
        list.className = 'cy-chat-l';
        const row = document.createElement('li');
        row.style.fontSize = '10px';
        row.style.lineHeight = '20px';
        const plainRow = document.createElement('li');
        plainRow.style.fontSize = '10px';
        plainRow.style.lineHeight = '20px';
        const image = document.createElement('img');
        image.className = 'cy-emo';
        row.appendChild(image);
        list.append(row, plainRow);
        document.body.appendChild(list);

        S.on = true;
        S.size = 'm';
        refreshEmotes();
        const frame = row.querySelector('.ext-native-emote-frame');
        expect(row.style.lineHeight).toBe('20px');
        expect(frame.style.height).toBe('2em');
        expect(frame.style.display).toBe('inline-flex');
        expect(plainRow.style.lineHeight).toBe('20px');
        expect(image.style.height).not.toBe('');
        expect(image.style.display).toBe('block');
        expect(image.style.height).toBe('100%');

        S.size = 'xxl';
        refreshEmotes();
        expect(frame.style.height).toBe('4.25em');

        S.on = false;
        refreshEmotes();
        expect(row.style.lineHeight).toBe('20px');
        expect(frame.style.display).toBe('none');
        expect(plainRow.style.lineHeight).toBe('20px');
        expect(image.classList.contains('ext-native-emote-hidden')).toBe(true);
        S.on = true;
        S.size = 'm';
    });
});
