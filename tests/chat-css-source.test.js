import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    fetchChatCssFromUrl,
    fetchChatThemeCatalog,
    validateChatCssUrl
} from '../src/chat/ui/chatCssSource.js';

const VALID_URL = 'https://cdn.jsdelivr.net/gh/example/themes@v1.2.0/chat/style.css';

describe('chat CSS URL source', () => {
    afterEach(() => {
        delete globalThis.chrome;
        delete globalThis.browser;
    });

    it('accepts direct, versioned jsDelivr GitHub CSS URLs', () => {
        expect(validateChatCssUrl(` ${VALID_URL} `)).toBe(VALID_URL);
    });

    it.each([
        'http://cdn.jsdelivr.net/gh/example/themes@v1.2.0/chat/style.css',
        'https://evil.example/gh/example/themes@v1.2.0/chat/style.css',
        'https://cdn.jsdelivr.net/npm/example/package/style.css',
        'https://cdn.jsdelivr.net/gh/example/themes@v1.2.0/chat/style.css?raw=1',
        'https://cdn.jsdelivr.net/gh/example/themes@v1.2.0/chat/../secret.css',
        'https://user:pass@cdn.jsdelivr.net/gh/example/themes@v1.2.0/chat/style.css',
        'https://cdn.jsdelivr.net/gh/example/themes@v1.2.0/chat/style.txt'
    ])('rejects unsupported URL %s', (url) => {
        expect(() => validateChatCssUrl(url)).toThrow();
    });

    it('fetches CSS through the extension background and returns its content', async () => {
        const sendMessage = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            body: '.cy-chat { color: pink; }'
        });
        globalThis.chrome = { runtime: { sendMessage } };

        await expect(fetchChatCssFromUrl(VALID_URL)).resolves.toBe('.cy-chat { color: pink; }');
        expect(sendMessage).toHaveBeenCalledWith({
            type: 'LEGION7TV_FETCH_CHAT_CSS',
            url: VALID_URL,
            timeout: 15000
        });
    });

    it('rejects invalid URLs before making a background request', async () => {
        const sendMessage = vi.fn();
        globalThis.chrome = { runtime: { sendMessage } };

        await expect(fetchChatCssFromUrl('https://evil.example/theme.css')).rejects.toThrow();
        expect(sendMessage).not.toHaveBeenCalled();
    });

    it('surfaces background errors and rejects oversized results', async () => {
        globalThis.chrome = {
            runtime: {
                sendMessage: vi.fn().mockResolvedValueOnce({ ok: false, error: 'network unavailable' })
            }
        };
        await expect(fetchChatCssFromUrl(VALID_URL)).rejects.toThrow('network unavailable');

        globalThis.chrome.runtime.sendMessage.mockResolvedValue({
            ok: true,
            body: 'x'.repeat(100 * 1024 + 1)
        });
        await expect(fetchChatCssFromUrl(VALID_URL)).rejects.toThrow('не должен быть больше 100 КиБ');
    });

    it('loads and validates the fixed public theme catalog', async () => {
        const catalog = {
            schemaVersion: 1,
            themes: [{
                id: 'demo',
                name: 'Demo',
                author: 'Author',
                version: '1.0.0',
                description: 'Example theme',
                tags: ['dark'],
                license: 'MIT',
                css: 'https://cdn.jsdelivr.net/gh/mykhailkot-pixel/Legion7TV-themes@v1.0.0/themes/demo/style.css',
                preview: 'https://cdn.jsdelivr.net/gh/mykhailkot-pixel/Legion7TV-themes@v1.0.0/themes/demo/preview.png'
            }]
        };
        const sendMessage = vi.fn().mockResolvedValue({
            ok: true,
            body: JSON.stringify(catalog)
        });
        globalThis.chrome = { runtime: { sendMessage } };

        await expect(fetchChatThemeCatalog()).resolves.toMatchObject({
            themes: [{
                id: 'demo',
                name: 'Demo',
                css: catalog.themes[0].css,
                preview: catalog.themes[0].preview
            }],
            warning: ''
        });
        expect(sendMessage).toHaveBeenCalledWith({
            type: 'LEGION7TV_FETCH_CHAT_CSS_CATALOG',
            timeout: 15000
        });
    });

    it('surfaces a catalog cache purge warning from the background', async () => {
        globalThis.chrome = {
            runtime: {
                sendMessage: vi.fn().mockResolvedValue({
                    ok: true,
                    body: JSON.stringify({ schemaVersion: 1, themes: [] }),
                    warning: 'jsDelivr ограничил частоту сброса кеша.'
                })
            }
        };

        await expect(fetchChatThemeCatalog()).resolves.toMatchObject({
            themes: [],
            warning: 'jsDelivr ограничил частоту сброса кеша.'
        });
    });

    it('rejects catalog entries that link CSS outside the themes repository', async () => {
        globalThis.chrome = {
            runtime: {
                sendMessage: vi.fn().mockResolvedValue({
                    ok: true,
                    body: JSON.stringify({
                        schemaVersion: 1,
                        themes: [{
                            id: 'demo',
                            name: 'Demo',
                            author: 'Author',
                            version: '1',
                            description: '',
                            tags: [],
                            css: VALID_URL
                        }]
                    })
                })
            }
        };

        await expect(fetchChatThemeCatalog()).rejects.toThrow('Файлы темы должны находиться');
    });
});
