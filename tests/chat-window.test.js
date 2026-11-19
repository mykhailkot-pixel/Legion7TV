import { describe, expect, it, vi } from 'vitest';
import {
    buildDetachedChatUrl,
    CHAT_WINDOW_QUERY,
    startChatWindowIntegration
} from '../src/chat/ui/chatWindow.js';

describe('detached chat window URL', () => {
    it('preserves the game route, clears its tab hash, and marks popup mode', () => {
        const result = new URL(buildDetachedChatUrl('https://legiongame.gg/play?room=trade#chat'));

        expect(result.origin).toBe('https://legiongame.gg');
        expect(result.pathname).toBe('/play');
        expect(result.searchParams.get('room')).toBe('trade');
        expect(result.searchParams.get(CHAT_WINDOW_QUERY)).toBe('1');
        expect(result.hash).toBe('');
    });

    it('rejects URLs outside the game origin', () => {
        expect(() => buildDetachedChatUrl('https://example.com/'))
            .toThrow('Отдельное окно чата можно открыть только на legiongame.gg.');
    });

    it('expands the chat and removes its collapse button in the popup', () => {
        history.replaceState({}, '', `/?${CHAT_WINDOW_QUERY}=1`);
        document.body.innerHTML = `
            <div class="cy-chat">
                <button class="cy-chat-t" aria-expanded="false"></button>
                <div class="cy-chat-b" hidden></div>
            </div>
        `;
        const toggle = document.querySelector('.cy-chat-t');
        const body = document.querySelector('.cy-chat-b');
        toggle.addEventListener('click', () => {
            body.hidden = false;
            toggle.setAttribute('aria-expanded', 'true');
        });
        vi.stubGlobal('requestAnimationFrame', (callback) => {
            callback();
            return 1;
        });

        startChatWindowIntegration();

        expect(body.hidden).toBe(false);
        expect(toggle.isConnected).toBe(true);
        expect(toggle.hidden).toBe(true);
    });
});
