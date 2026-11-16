import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getText: vi.fn() }));
vi.mock('../src/network/net.js', () => ({ getText: mocks.getText }));

import { configureExtensionStore, store } from '../src/core/store.js';
import {
    clearResolvedImageCache,
    registerImageProvider,
    resolveImageUrl,
    supportsImageUrl
} from '../src/chat/ui/imageProviders.js';

describe('image providers', () => {
    beforeEach(() => {
        configureExtensionStore({}, vi.fn().mockResolvedValue(undefined));
        clearResolvedImageCache();
        mocks.getText.mockReset();
    });

    it('recognizes supported secure imgBB image and gallery URLs', () => {
        expect(supportsImageUrl('https://i.ibb.co/abc/photo.webp')).toBe(true);
        expect(supportsImageUrl('https://ibb.co/AbC123')).toBe(true);
        expect(supportsImageUrl('https://imgbb.com/gallery/AbC123')).toBe(true);
        expect(supportsImageUrl('http://ibb.co/AbC123')).toBe(false);
        expect(supportsImageUrl('https://ibb.co/')).toBe(false);
        expect(supportsImageUrl('https://example.com/image.png')).toBe(false);
    });

    it('returns direct image URLs without fetching a landing page', async () => {
        const url = 'https://i.ibb.co/abc/photo.webp';
        await expect(resolveImageUrl(url)).resolves.toBe(url);
        expect(mocks.getText).not.toHaveBeenCalled();
    });

    it('extracts and resolves supported image metadata from imgBB HTML', async () => {
        mocks.getText.mockResolvedValue(
            '<meta property="og:image" content="//i.ibb.co/abc/photo.webp?x=1&amp;y=2">'
        );
        const result = await resolveImageUrl('https://ibb.co/AbC123');
        expect(result).toBe('https://i.ibb.co/abc/photo.webp?x=1&y=2');
        expect(mocks.getText).toHaveBeenCalledWith('https://ibb.co/AbC123');
    });

    it('coalesces concurrent resolutions and caches successful results', async () => {
        let finish;
        mocks.getText.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
        const first = resolveImageUrl('https://ibb.co/AbC123');
        const second = resolveImageUrl('https://ibb.co/AbC123');
        await Promise.resolve();
        finish('<meta name="twitter:image" content="https://i.ibb.co/a/p.webp">');
        await expect(Promise.all([first, second])).resolves.toEqual([
            'https://i.ibb.co/a/p.webp',
            'https://i.ibb.co/a/p.webp'
        ]);
        await expect(resolveImageUrl('https://ibb.co/AbC123')).resolves.toBe('https://i.ibb.co/a/p.webp');
        expect(mocks.getText).toHaveBeenCalledOnce();
    });

    it('rejects malformed or non-HTTPS resolved URLs and clears persistent cache', async () => {
        registerImageProvider({
            id: 'test-invalid-resolver',
            match: (url) => url.hostname === 'example.test',
            isImageUrl: () => false,
            resolve: async () => 'https://evil.test/image.png'
        });
        await expect(resolveImageUrl('not a url')).resolves.toBeNull();
        await expect(resolveImageUrl('http://ibb.co/AbC123')).resolves.toBeNull();
        await expect(resolveImageUrl('https://example.test/x')).resolves.toBeNull();
        clearResolvedImageCache();
        expect(store.get('t7ImageResolveCache')).toEqual({});
    });

    it('rejects malformed and duplicate provider registrations', () => {
        expect(() => registerImageProvider(null)).toThrow(TypeError);
        const provider = {
            id: 'test-registration',
            match: () => false,
            isImageUrl: () => false,
            resolve: async () => ''
        };
        registerImageProvider(provider);
        expect(() => registerImageProvider(provider)).toThrow(/already registered/);
    });
});
