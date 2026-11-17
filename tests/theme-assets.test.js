import { describe, expect, it } from 'vitest';
import {
    detectThemeImageType,
    encodeThemeImage,
    normalizeChatTheme,
    normalizeThemeImageUrl
} from '../src/chat/ui/themeAssets.js';

describe('chat theme image assets', () => {
    it('recognizes only supported raster image signatures', () => {
        expect(detectThemeImageType(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
            .toBe('image/png');
        expect(detectThemeImageType(Uint8Array.from([0xff, 0xd8, 0xff])))
            .toBe('image/jpeg');
        expect(detectThemeImageType(Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])))
            .toBe('image/webp');
        expect(detectThemeImageType(Uint8Array.from([0x3c, 0x73, 0x76, 0x67])))
            .toBe('');
    });

    it('normalizes HTTPS image URLs and blocks insecure or local hosts', () => {
        expect(normalizeThemeImageUrl(' https://images.example.com/texture.webp#preview ').href)
            .toBe('https://images.example.com/texture.webp');
        expect(() => normalizeThemeImageUrl('http://images.example.com/texture.webp')).toThrow(/HTTPS/);
        expect(() => normalizeThemeImageUrl('https://127.0.0.1/image.png')).toThrow(/общедоступный/);
        expect(() => normalizeThemeImageUrl('https://printer.local/image.png')).toThrow(/общедоступный/);
    });

    it('validates theme asset IDs, image bytes, and decoded dimensions', () => {
        const bytes = new Uint8Array(24);
        bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
        bytes.set([0x49, 0x48, 0x44, 0x52], 12);
        bytes[19] = 1;
        bytes[23] = 1;
        const data = encodeThemeImage(bytes);
        expect(normalizeChatTheme({
            version: 1,
            css: '.cy-chat { color: white; }',
            assets: { brass: { mime: 'image/png', data, width: 1, height: 1 } }
        }).assets.brass.mime).toBe('image/png');
        expect(() => normalizeChatTheme({
            version: 1,
            css: '',
            assets: { '../brass': { mime: 'image/png', data, width: 1, height: 1 } }
        })).toThrow(/ID/);
        expect(() => normalizeChatTheme({
            version: 1,
            css: '',
            assets: { brass: { mime: 'image/png', data, width: 5000, height: 1 } }
        })).toThrow(/Размеры изображения/);
    });
});
