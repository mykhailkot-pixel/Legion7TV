import { describe, expect, it } from 'vitest';
import { registerChatButton, updateChatButtons } from '../src/chat/ui/chatButtonState.js';

describe('chat button visibility', () => {
    it('combines feature enablement with per-button visibility and unregisters cleanly', () => {
        const host = document.createElement('div');
        const button = document.createElement('button');
        document.body.append(host);
        const unregister = registerChatButton('pastes', host, button, false);

        updateChatButtons('pastes', true);
        expect(button.hidden).toBe(true);
        expect(host.hidden).toBe(true);
        updateChatButtons('pastes', false);
        expect(button.hidden).toBe(true);
        expect(host.hidden).toBe(true);
        unregister();
        host.remove();
    });

    it('removes disconnected buttons and rejects unknown features', () => {
        const host = document.createElement('div');
        const button = document.createElement('button');
        const unregister = registerChatButton('imagePicker', host, button, true);
        expect(() => updateChatButtons('unknown', true)).toThrow(/Unknown/);
        expect(() => registerChatButton('unknown', host, button, true)).toThrow(/Unknown/);
        updateChatButtons('imagePicker', true);
        expect(button.hidden).toBe(false);
        expect(host.hidden).toBe(false);
        host.remove();
        updateChatButtons('imagePicker', false);
        unregister();
    });
});
