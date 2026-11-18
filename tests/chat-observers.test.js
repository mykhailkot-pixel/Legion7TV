import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/chat/messages/chat.js', () => ({ scan: vi.fn() }));
vi.mock('../src/chat/ui/chatInput.js', () => ({
    disposeInputBindings: vi.fn(),
    ensureButtons: vi.fn()
}));

import { startChatObservers } from '../src/chat/ui/chatObservers.js';

describe('chat observers', () => {
    beforeEach(() => {
        document.body.replaceChildren();
    });

    it('suppresses replay animations for messages rebuilt by the site but not new messages', async () => {
        const list = document.createElement('ul');
        list.className = 'cy-chat-l';
        const previous = document.createElement('li');
        previous.dataset.mid = 'message-1';
        list.append(previous);
        document.body.append(list);

        const stop = startChatObservers();
        const rebuilt = document.createElement('li');
        rebuilt.dataset.mid = 'message-1';
        const fresh = document.createElement('li');
        fresh.dataset.mid = 'message-2';
        list.replaceChildren(rebuilt, fresh);
        await Promise.resolve();

        expect(rebuilt.hasAttribute('data-t7-reused-message')).toBe(true);
        expect(fresh.hasAttribute('data-t7-reused-message')).toBe(false);
        stop();
    });
});
