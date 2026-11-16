import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getBuf: vi.fn() }));
vi.mock('../src/network/net.js', () => ({ getBuf: mocks.getBuf }));

import { clearImgs, fetchImg, getLoadedImgUrl } from '../src/emotes/imgcache.js';

describe('extension-backed emote image cache', () => {
    beforeEach(() => {
        mocks.getBuf.mockReset();
        mocks.getBuf.mockResolvedValue(new Blob(['img'], { type: 'image/webp' }));
        globalThis.chrome = {
            runtime: {
                sendMessage: vi.fn(async (message) => {
                    if (message.type === 'IMG_GET_BATCH') {
                        return { ok: true, results: message.requests.map(() => ({ found: false })) };
                    }
                    return { ok: true };
                })
            }
        };
        Object.defineProperty(URL, 'createObjectURL', {
            configurable: true,
            value: vi.fn(() => 'blob:unit-test')
        });
    });

    it('coalesces requests, populates the in-memory URL cache, and persists the fetched Blob', async () => {
        const first = fetchImg('https://cdn.7tv.app/image.webp', true);
        const second = fetchImg('https://cdn.7tv.app/image.webp', false);
        await expect(Promise.all([first, second])).resolves.toEqual(['blob:unit-test', 'blob:unit-test']);
        expect(mocks.getBuf).toHaveBeenCalledOnce();
        expect(getLoadedImgUrl('https://cdn.7tv.app/image.webp')).toBe('blob:unit-test');
        expect(globalThis.chrome.runtime.sendMessage).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'IMG_PUT', url: 'https://cdn.7tv.app/image.webp' })
        );
    });

    it('clears local and extension caches', async () => {
        await fetchImg('https://cdn.7tv.app/image.webp', true);
        await clearImgs();
        expect(getLoadedImgUrl('https://cdn.7tv.app/image.webp')).toBe('');
        expect(globalThis.chrome.runtime.sendMessage).toHaveBeenLastCalledWith({ type: 'IMG_CLEAR' });
    });
});
