import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    fetchImg: vi.fn(),
    getLoadedImgUrl: vi.fn()
}));
vi.mock('../src/emotes/imgcache.js', () => mocks);

import { getEmoteCreatedAt, setEmoteImage, urlFor } from '../src/emotes/emotes.js';

describe('emote metadata and images', () => {
    beforeEach(() => {
        mocks.fetchImg.mockReset();
        mocks.getLoadedImgUrl.mockReset();
    });

    it('normalizes creation timestamps and selects the matching version date', () => {
        expect(getEmoteCreatedAt({ id: 'x', createdAt: 123 })).toBe(123000);
        expect(getEmoteCreatedAt({
            id: 'x',
            versions: [{ id: 'other', createdAt: 10 }, { id: 'x', createdAt: 1_700_000_000_000 }]
        })).toBe(1_700_000_000_000);
        expect(getEmoteCreatedAt({ created_at: 'invalid' })).toBe(0);
    });

    it('selects the nearest available resolution not larger than requested', () => {
        const emote = { base: 'https://cdn.test/emote', f: ['1x.webp', '2x.webp', '4x.webp'] };
        expect(urlFor(emote, 3)).toBe('https://cdn.test/emote/2x.webp');
        expect(urlFor(emote, 1)).toBe('https://cdn.test/emote/1x.webp');
        expect(urlFor(emote, 0)).toBe('https://cdn.test/emote/1x.webp');
    });

    it('uses cached image URLs immediately and skips stale asynchronous updates', async () => {
        const emote = { base: 'https://cdn.test/emote', f: ['1x.webp', '2x.webp'] };
        const image = document.createElement('img');
        mocks.getLoadedImgUrl.mockReturnValue('blob:cached');
        setEmoteImage(image, emote, 2);
        expect(image.src).toBe('blob:cached');
        expect(mocks.fetchImg).not.toHaveBeenCalled();

        mocks.getLoadedImgUrl.mockReturnValue('');
        mocks.fetchImg.mockResolvedValue('blob:loaded');
        setEmoteImage(image, emote, 2, 'lazy', null, () => false);
        await Promise.resolve();
        expect(image.getAttribute('src')).toBe('blob:cached');
        expect(mocks.fetchImg).toHaveBeenCalledOnce();
    });
});
