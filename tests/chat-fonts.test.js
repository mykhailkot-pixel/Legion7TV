import { beforeEach, describe, expect, it, vi } from 'vitest';
import { configureExtensionStore, store } from '../src/core/store.js';
import {
    getChatFont,
    getChatFontSize,
    getCustomChatFont,
    removeCustomChatFont,
    setChatFont,
    setChatFontSize,
    uploadChatFont
} from '../src/chat/ui/chatFonts.js';

describe('chat font settings', () => {
    beforeEach(() => configureExtensionStore({}, vi.fn().mockResolvedValue(undefined)));

    it('defaults invalid font values and clamps font size', () => {
        store.set('t7ChatFont', 'invalid');
        store.set('t7ChatFontSize', 99);
        expect(getChatFont()).toBe('site');
        expect(getChatFontSize()).toBe(22);
        expect(setChatFontSize(10)).toBe(11);
        expect(setChatFontSize(17.6)).toBe(18);
        expect(setChatFontSize('not a number')).toBe(14);
        expect(store.get('t7ChatFontSize')).toBe(18);
    });

    it('validates font choice and custom font records', async () => {
        expect(getCustomChatFont()).toBeNull();
        expect(await setChatFont('unknown')).toBe(false);
        expect(await setChatFont('custom')).toBe(false);
        expect(await setChatFont('roboto')).toBe(true);
        expect(getChatFont()).toBe('roboto');
        store.set('t7ChatFontFile', { name: 'font.woff2', source: 'data:font/woff2;base64,AA==' });
        expect(getCustomChatFont()).toEqual({ name: 'font.woff2', source: 'data:font/woff2;base64,AA==' });
    });

    it('rejects unsupported or oversized uploads and removes custom settings safely', async () => {
        await expect(uploadChatFont(new File(['x'], 'font.exe'))).rejects.toThrow(/форматы/);
        await expect(uploadChatFont()).rejects.toThrow(/Выберите/);
        await removeCustomChatFont();
        expect(store.get('t7ChatFontFile')).toBeNull();
    });
});
