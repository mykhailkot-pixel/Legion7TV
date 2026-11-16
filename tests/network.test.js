import { afterEach, describe, expect, it, vi } from 'vitest';
import { configureExtensionStore, store } from '../src/core/store.js';
import {
    getBuf,
    getJson,
    getProxy,
    getText,
    normProxy,
    setProxy,
    testProxy
} from '../src/network/net.js';

describe('network helpers', () => {
    afterEach(() => {
        delete globalThis.chrome;
        delete globalThis.browser;
    });

    it('normalizes only HTTPS proxy origins', () => {
        expect(normProxy(' https://proxy.example/path/ ')).toBe('https://proxy.example');
        expect(normProxy('http://proxy.example')).toBe('');
        expect(normProxy('not a url')).toBe('');
        expect(normProxy('')).toBe('');
    });

    it('stores the normalized proxy setting', () => {
        configureExtensionStore({}, vi.fn().mockResolvedValue(undefined));
        setProxy('https://proxy.example/base');
        expect(getProxy()).toBe('https://proxy.example');
        expect(store.get('t7proxy')).toBe('https://proxy.example');
    });

    it('rejects disallowed hosts before messaging the extension', async () => {
        const sendMessage = vi.fn();
        globalThis.chrome = { runtime: { sendMessage } };
        await expect(getText('https://evil.example/data')).rejects.toThrow('url not allowed');
        expect(sendMessage).not.toHaveBeenCalled();
    });

    it('requests allowed URLs and parses text and JSON responses', async () => {
        const sendMessage = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            body: '{"items":[1]}'
        });
        globalThis.chrome = { runtime: { sendMessage } };
        await expect(getText('https://7tv.io/v3/test')).resolves.toBe('{"items":[1]}');
        await expect(getJson('https://cdn.7tv.app/test')).resolves.toEqual({ items: [1] });
        expect(sendMessage).toHaveBeenNthCalledWith(1, {
            type: 'LEGION7TV_FETCH',
            url: 'https://7tv.io/v3/test',
            responseType: undefined,
            timeout: 15000
        });
    });

    it('decodes extension blob responses to a typed Blob', async () => {
        globalThis.chrome = {
            runtime: { sendMessage: vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                body: btoa('image-bytes'),
                contentType: 'image/png'
            }) }
        };
        const originalFileReader = globalThis.FileReader;
        globalThis.FileReader = class {
            constructor() { throw new Error('getBuf should not copy through FileReader'); }
        };
        try {
            const blob = await getBuf('https://cdn.7tv.app/image');
            expect(blob.type).toBe('image/png');
            expect(blob.size).toBe('image-bytes'.length);
        } finally {
            globalThis.FileReader = originalFileReader;
        }
    });

    it('falls back to the original allowed URL when the proxy fails', async () => {
        setProxy('https://proxy.example');
        const sendMessage = vi.fn()
            .mockRejectedValueOnce(new Error('proxy unavailable'))
            .mockResolvedValueOnce({ ok: true, status: 200, body: 'direct' });
        globalThis.chrome = { runtime: { sendMessage } };
        await expect(getText('https://7tv.io/v3/test')).resolves.toBe('direct');
        expect(sendMessage).toHaveBeenNthCalledWith(1, expect.objectContaining({
            url: 'https://proxy.example/api/v3/test',
            timeout: 6000
        }));
        expect(sendMessage).toHaveBeenNthCalledWith(2, expect.objectContaining({
            url: 'https://7tv.io/v3/test',
            timeout: 15000
        }));
    });

    it('validates proxy test response shape', async () => {
        globalThis.chrome = {
            runtime: { sendMessage: vi.fn().mockResolvedValue({
                ok: true,
                body: JSON.stringify({ emotes: [{ id: 'a' }, { id: 'b' }] })
            }) }
        };
        await expect(testProxy('http://proxy.example')).rejects.toThrow(/https/);
        globalThis.chrome.runtime.sendMessage.mockResolvedValue({
            ok: true,
            body: JSON.stringify({ emotes: [{ id: 'a' }, { id: 'b' }] })
        });
        await expect(testProxy('https://proxy.example')).resolves.toBe(2);
    });
});
