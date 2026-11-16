import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    fetchImg: vi.fn(),
    resolveImageUrl: vi.fn(),
    supportsImageUrl: vi.fn((value) => {
        try { return new URL(value).hostname.endsWith('ibb.co'); }
        catch { return false; }
    }),
    rememberSentImages: vi.fn(),
    preserve: vi.fn((_anchor, update) => update())
}));

vi.mock('../src/emotes/imgcache.js', () => ({ fetchImg: mocks.fetchImg }));
vi.mock('../src/chat/ui/imageProviders.js', () => ({
    resolveImageUrl: mocks.resolveImageUrl,
    supportsImageUrl: mocks.supportsImageUrl
}));
vi.mock('../src/chat/ui/imagePicker.js', () => ({ rememberSentImages: mocks.rememberSentImages }));
vi.mock('../src/chat/messages/scrollState.js', () => ({ chatScroller: { preserve: mocks.preserve } }));
vi.mock('../src/core/ui.js', () => ({ cls: (name) => `ext-${name}` }));

import { configureExtensionStore, store } from '../src/core/store.js';
import {
    areImagePreviewsEnabled,
    bindOutgoingLinkEncoding,
    encodeLinks,
    isLinkEncodingEnabled,
    isSafeHttpsUrl,
    processLinks,
    refToUrl,
    setImagePreviewsEnabled,
    setLinkEncodingEnabled,
    trimTrailingPunct
} from '../src/chat/messages/links.js';

describe('chat links', () => {
    beforeEach(() => {
        configureExtensionStore({}, vi.fn().mockResolvedValue(undefined));
        mocks.fetchImg.mockReset();
        mocks.resolveImageUrl.mockReset();
        mocks.rememberSentImages.mockReset();
    });

    it('normalizes and validates link preferences', () => {
        expect(isLinkEncodingEnabled()).toBe(true);
        expect(areImagePreviewsEnabled()).toBe(false);
        setLinkEncodingEnabled(false);
        setImagePreviewsEnabled(true);
        expect(isLinkEncodingEnabled()).toBe(false);
        expect(areImagePreviewsEnabled()).toBe(true);
        expect(store.get('t7LinkEncoding')).toBe(false);
        expect(store.get('t7ImagePreviews')).toBe(true);
    });

    it('strips punctuation while preserving balanced URL parentheses', () => {
        expect(trimTrailingPunct('https://x.test/a_(b).').clean).toBe('https://x.test/a_(b)');
        expect(trimTrailingPunct('https://x.test/a_(b)', { stripClosingParens: true }).clean)
            .toBe('https://x.test/a_(b');
        expect(trimTrailingPunct('https://x.test/a]tail', { stripBrackets: true }).clean)
            .toBe('https://x.test/a]tail');
        expect(trimTrailingPunct('https://x.test/a"', { stripQuotes: true }).tail).toBe('"');
    });

    it('accepts only HTTPS URLs with valid hostnames', () => {
        expect(isSafeHttpsUrl('https://example.com/a')).toBe(true);
        expect(isSafeHttpsUrl('http://example.com')).toBe(false);
        expect(isSafeHttpsUrl('javascript:alert(1)')).toBe(false);
        expect(isSafeHttpsUrl('https://bad host.example')).toBe(false);
    });

    it('encodes domains and path punctuation, and decodes refs for display', () => {
        expect(encodeLinks('See https://Example.com/a.b?q=x.y!'))
            .toBe('See [ref]{example_com/a%2Eb?q=x%2Ey}!');
        expect(encodeLinks('www.example.org/page')).toBe('[ref]{www_example_org/page}');
        expect(refToUrl('www_example_org/a%2Eb?x=1')).toBe('https://www.example.org/a.b?x=1');
        expect(encodeLinks('plain text')).toBe('plain text');
    });

    it('linkifies safe URLs but leaves unsafe URLs and existing anchors alone', () => {
        const content = document.createElement('div');
        content.innerHTML = 'https://example.com/a. <a href="#">www.example.org</a> http://bad.test';
        setLinkEncodingEnabled(true);
        processLinks({ content, room: 'g' });
        const link = content.querySelector('a.ext-link');
        expect(link?.href).toBe('https://example.com/a');
        expect(link?.textContent).toBe('https://example.com/a');
        expect(link?.rel).toBe('noopener noreferrer');
        expect(content.querySelector('a:not(.ext-link)')?.textContent).toBe('www.example.org');
        expect(content.textContent).toContain('http://bad.test');
    });

    it('temporarily encodes outgoing links on Enter and restores the draft', async () => {
        const form = document.createElement('form');
        const input = document.createElement('input');
        input.type = 'text';
        input.value = 'https://example.com/a.b';
        form.append(input);
        document.body.append(form);
        setLinkEncodingEnabled(true);
        const dispose = bindOutgoingLinkEncoding(form, input);
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        expect(input.value).toBe('[ref]{example_com/a%2Eb}');
        expect(mocks.rememberSentImages).toHaveBeenCalledWith('https://example.com/a.b');
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(input.value).toBe('https://example.com/a.b');
        dispose();
        form.remove();
    });

    it('encodes outgoing links in guild chat', () => {
        const chat = document.createElement('div');
        chat.className = 'cy-chat';
        const tabs = document.createElement('div');
        const guildTab = document.createElement('button');
        guildTab.dataset.tab = 'gl';
        guildTab.setAttribute('aria-selected', 'true');
        tabs.append(guildTab);
        const form = document.createElement('form');
        const input = document.createElement('input');
        input.value = 'https://example.com/a';
        form.append(input);
        chat.append(tabs, form);
        document.body.append(chat);
        setLinkEncodingEnabled(true);
        const dispose = bindOutgoingLinkEncoding(form, input);

        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

        expect(input.value).toBe('[ref]{example_com/a}');
        dispose();
        chat.remove();
    });

    it('binds only once per form and returns a safe disposer', () => {
        const form = document.createElement('form');
        const input = document.createElement('input');
        form.append(input);
        const first = bindOutgoingLinkEncoding(form, input);
        const second = bindOutgoingLinkEncoding(form, input);
        expect(second()).toBeUndefined();
        expect(() => first()).not.toThrow();
        expect(() => first()).not.toThrow();
    });
});
