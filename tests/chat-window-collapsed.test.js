import { describe, expect, it } from 'vitest';
import { startChatWindowIntegration } from '../src/chat/ui/chatWindow.js';
import { cls } from '../src/core/ui.js';

describe('collapsed chat window button', () => {
    it('places a separate-window button beside the collapsed chat toggle', () => {
        document.body.innerHTML = `
            <div class="cy-chat">
                <button class="cy-chat-t" aria-expanded="false">Чат</button>
                <div class="cy-chat-b" hidden>
                    <div class="cy-chat-h">
                        <div class="cy-chat-tabs"></div>
                        <button class="cy-chat-x"></button>
                    </div>
                </div>
            </div>
        `;

        startChatWindowIntegration();

        const controls = document.querySelector(`.${cls('chat-collapsed-controls')}`);
        const toggle = document.querySelector('.cy-chat-t');
        const button = controls.querySelector(`.${cls('chat-window-collapsed-button')}`);

        expect(controls.contains(toggle)).toBe(true);
        expect(controls.firstElementChild).toBe(toggle);
        expect(button.classList.contains('cy-chat-t')).toBe(false);
        expect(button.classList.contains(cls('chat-window-button'))).toBe(true);
        expect(button.className.endsWith('-chat-window-button')).toBe(true);
        expect(button.getAttribute('aria-label')).toBe('Открыть чат в отдельном окне');
        expect(document.querySelector(`.${cls('chat-window-button')}`)).not.toBeNull();
    });
});
