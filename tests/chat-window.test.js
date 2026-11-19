import { describe, expect, it } from 'vitest';
import { buildDetachedChatUrl, CHAT_WINDOW_QUERY } from '../src/chat/ui/chatWindow.js';

describe('detached chat window URL', () => {
    it('preserves the current game URL and marks the popup mode', () => {
        const result = new URL(buildDetachedChatUrl('https://legiongame.gg/play?room=trade#chat'));

        expect(result.origin).toBe('https://legiongame.gg');
        expect(result.pathname).toBe('/play');
        expect(result.searchParams.get('room')).toBe('trade');
        expect(result.searchParams.get(CHAT_WINDOW_QUERY)).toBe('1');
        expect(result.hash).toBe('#chat');
    });

    it('rejects URLs outside the game origin', () => {
        expect(() => buildDetachedChatUrl('https://example.com/'))
            .toThrow('Отдельное окно чата можно открыть только на legiongame.gg.');
    });
});
