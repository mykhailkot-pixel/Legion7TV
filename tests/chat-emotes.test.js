import { describe, expect, it } from 'vitest';
import { extractNativeEmotes, restoreNativeEmotes } from '../src/chat/messages/chatEmotes.js';

describe('native chat emotes', () => {
    it('preserves the original site image nodes while text is processed', () => {
        const content = document.createElement('span');
        const image = document.createElement('img');
        image.className = 'cy-emo';
        image.alt = 'Kappa';
        image.src = '/api/emote/7tv/0123456789abcdefghij/1x.webp';
        content.append(document.createTextNode('hello '), image, document.createTextNode('!'));

        const native = extractNativeEmotes(content);
        content.replaceChildren(document.createTextNode(native.source));
        expect(content.querySelector('img')).toBeNull();
        restoreNativeEmotes(content, native.images);

        expect(content.textContent).toBe('hello !');
        expect(content.querySelector('img.cy-emo')).toBe(image);
        expect(image.getAttribute('src')).toContain('/api/emote/7tv/');
    });

    it('falls back to the native emote name if a referenced image disappeared', () => {
        const content = document.createElement('span');
        content.appendChild(document.createTextNode('<\uE000L7N0:Kappa\uE001>'));

        restoreNativeEmotes(content, []);
        expect(content.textContent).toBe('Kappa');
    });
});
