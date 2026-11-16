import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    setEmoteImage: vi.fn((image) => image.setAttribute('src', 'blob:emote')),
    getLoadedImgUrl: vi.fn(() => ''),
    setEmoteTooltipData: vi.fn()
}));
vi.mock('../src/emotes/emotes.js', () => ({
    setEmoteImage: mocks.setEmoteImage,
    urlFor: vi.fn(() => 'https://cdn.test/emote/2x.webp')
}));
vi.mock('../src/emotes/imgcache.js', () => ({ getLoadedImgUrl: mocks.getLoadedImgUrl }));
vi.mock('../src/emotes/tooltip.js', () => ({ setEmoteTooltipData: mocks.setEmoteTooltipData }));
vi.mock('../src/core/ui.js', () => ({
    cls: (name) => `ext-${name}`,
    cssVar: (name) => `--ext-${name}`
}));

import { EM, S } from '../src/core/state.js';
import { processEmotes } from '../src/chat/messages/chatEmotes.js';

describe('chat emote processing', () => {
    beforeEach(() => {
        S.on = true;
        S.size = 'm';
        for (const key of Object.keys(EM)) delete EM[key];
        mocks.setEmoteImage.mockClear();
        mocks.getLoadedImgUrl.mockReturnValue('');
    });

    it('replaces known emote words with images and leaves ordinary text intact', () => {
        EM.Kappa = { base: 'https://cdn.test/emote', f: ['1x.webp', '2x.webp'], r: 1.5 };
        const content = document.createElement('span');
        content.textContent = 'hello Kappa !';
        processEmotes({ content, kind: 'message' });
        expect(content.textContent).toBe('hello Kappa !');
        expect(content.querySelector('span.ext-w img.ext-e')?.alt).toBe('Kappa');
        expect(content.querySelector('img.ext-e')?.src).toBe('blob:emote');
        expect(mocks.setEmoteTooltipData).toHaveBeenCalledOnce();
    });

    it('keeps zero-width emotes inside the preceding emote wrapper', () => {
        EM.Base = { base: 'https://cdn.test/base', f: ['1x.webp'] };
        EM.ZW = { base: 'https://cdn.test/zw', f: ['1x.webp'], zw: true };
        const content = document.createElement('span');
        content.textContent = 'Base ZW';
        processEmotes({ content, kind: 'message' });
        const wrapper = content.querySelector('.ext-w');
        expect(wrapper.querySelector('img.ext-e').alt).toBe('Base');
        expect(wrapper.querySelector('img.ext-zw').alt).toBe('ZW');
    });

    it('does not process non-message content, disabled emotes, or text inside links', () => {
        EM.Kappa = { base: 'https://cdn.test/emote', f: ['1x.webp'] };
        const content = document.createElement('span');
        content.innerHTML = '<a>Kappa</a> Kappa';
        processEmotes({ content, kind: 'system' });
        expect(content.querySelectorAll('img')).toHaveLength(0);
        S.on = false;
        processEmotes({ content, kind: 'message' });
        expect(content.querySelectorAll('img')).toHaveLength(0);
    });
});
