import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    shouldNotifyDm: vi.fn(() => true),
    playDm: vi.fn(() => Promise.resolve())
}));
vi.mock('../src/chat/pingSystem.js', () => ({
    pingSystem: { shouldNotifyDm: mocks.shouldNotifyDm, playDm: mocks.playDm }
}));

import { startDirectMessageObserver } from '../src/chat/integration/directMessages.js';

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('direct-message sound observer', () => {
    it('ignores initial and own messages, then notifies only for new incoming rows', async () => {
        const root = document.createElement('div');
        root.className = 'dm';
        const recipient = document.createElement('span');
        recipient.className = 'dm-who';
        recipient.textContent = 'alice';
        const list = document.createElement('ul');
        list.className = 'dm-l';
        const oldMessage = document.createElement('li');
        oldMessage.textContent = 'old';
        list.append(oldMessage);
        root.append(recipient, list);
        document.body.append(root);

        startDirectMessageObserver();
        await tick();
        expect(mocks.playDm).not.toHaveBeenCalled();

        const incoming = document.createElement('li');
        incoming.textContent = 'incoming';
        list.append(incoming);
        await tick();
        expect(mocks.shouldNotifyDm).toHaveBeenCalledWith('alice');
        expect(mocks.playDm).toHaveBeenCalledOnce();

        const ownMessage = document.createElement('li');
        ownMessage.className = 'me';
        ownMessage.textContent = 'mine';
        list.append(ownMessage);
        await tick();
        expect(mocks.playDm).toHaveBeenCalledOnce();

        recipient.textContent = 'bob';
        const recipientHistory = document.createElement('li');
        recipientHistory.textContent = 'history';
        list.append(recipientHistory);
        await tick();
        expect(mocks.playDm).toHaveBeenCalledOnce();
    });
});
