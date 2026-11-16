import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    start: vi.fn(),
    register: vi.fn(),
    keep: vi.fn((_list, mutate) => mutate()),
    isAtEnd: vi.fn(() => false),
    scrollToEnd: vi.fn(),
    preserveEmoteImages: vi.fn(),
    processMarkdown: vi.fn(),
    processLinks: vi.fn(),
    processEmotes: vi.fn(),
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
vi.mock('../src/chat/messages/markdown.js', () => ({ processMarkdown: mocks.processMarkdown }));
vi.mock('../src/chat/messages/links.js', () => ({ processLinks: mocks.processLinks }));
vi.mock('../src/chat/messages/chatEmotes.js', () => ({
    preserveEmoteImages: mocks.preserveEmoteImages,
    processEmotes: mocks.processEmotes
}));
vi.mock('../src/chat/messages/mentions.js', () => ({ processMentions: mocks.processMentions }));
import { registerChatProcessor, rescanAll, scan } from '../src/chat/messages/chat.js';
import { isMessageProcessed } from '../src/chat/messages/messageState.js';

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
});
